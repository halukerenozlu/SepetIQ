"""
Decisions Router — /api/v1/decisions/*
----------------------------------------
Endpoint'ler:

  POST /analyze               → SSE stream başlatır (7 ajan akışı)
  POST /{decision_id}/answer  → Need Analyzer sorularına cevap gönderir, stream'i devam ettirir
  GET  /{decision_id}         → Tamamlanmış kararı döner
  GET  /{decision_id}/trace   → Sadece agent trace listesini döner

SSE Akış Mimarisi:
  - _run_pipeline: background task, graph'ı çalıştırır, event'leri queue'ya koyar
  - _event_stream: SSE generator, queue'dan okur, client'a akıtır
  - asyncio.Event: need_analyzer sorular üretince pipeline duraklıyor,
                   /answer endpoint'i event'i set ediyor, pipeline devam ediyor
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from langgraph.errors import GraphInterrupt
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from middleware.auth import get_user_id
from models.schemas import DecisionRequest
from models.state import AgentState
from services import decision_store, supabase_client

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Supabase persistence helper
# ─────────────────────────────────────────────────────────────────────────────


async def _save_to_supabase(
    record: decision_store.DecisionRecord,
    state_values: dict,
    verdict_out: dict,
    tone_out: dict,
    traces: list,
) -> None:
    """
    Saves a completed decision to Supabase decisions table.
    All errors are caught and logged — this must never interrupt the pipeline.
    """
    try:
        total_duration_ms: int = sum(int(t.get("duration_ms") or 0) for t in traces if isinstance(t, dict))
        decision_row = {
            "user_id": record.user_id,
            "product_name": state_values.get("product_name") or "Unknown Product",
            "product_category": state_values.get("product_category") or "electronics",
            "product_price": float(state_values.get("product_price") or 0.0),
            "product_url": record.product_url or None,
            "mode_used": record.mode,
            "verdict": verdict_out.get("verdict", "wait"),
            "confidence": int(verdict_out.get("confidence_score") or 50),
            "headline": tone_out.get("headline") or "",
            "body": tone_out.get("body") or "",
            "suggested_action": (tone_out.get("suggested_action") or verdict_out.get("suggested_action")),
            "total_duration_ms": total_duration_ms or None,
        }
        await supabase_client.save_decision(decision_row)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Supabase save failed (non-fatal): %s", exc)


router = APIRouter(prefix="/api/v1/decisions", tags=["decisions"])

# LangGraph node names (must match orchestrator.py add_node calls)
_AGENT_NODES = frozenset(
    {
        "product_context",
        "parallel_analysis",
        "need_analyzer",
        "need_analyzer_second_pass",
        "verdict",
        "tone_writer",
    }
)

# SSE stream timeout per queue.get() (keepalive interval)
_QUEUE_TIMEOUT_S: float = 1.0
# Max wait time for user to answer questions
_ANSWER_TIMEOUT_S: float = 300.0


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────


class AnswerRequest(BaseModel):
    answers: dict[str, str]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _sse_item(event: str, data: Any) -> dict:
    """Formats a dict ready for sse_starlette's EventSourceResponse."""
    return {"event": event, "data": json.dumps(data, ensure_ascii=False)}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _price_segment(price: float) -> str:
    """Mirrors the same helper in product_context.py."""
    if price < 500:
        return "budget"
    if price < 5_000:
        return "mid"
    if price < 20_000:
        return "premium"
    return "luxury"


def _display_product_name(name: str | None, seller: str | None) -> str:
    """Normalizes scraped names where seller and product were glued together."""
    clean_name = " ".join((name or "").split())
    clean_seller = " ".join((seller or "").split())

    if not clean_name:
        return "Unknown Product"
    if not clean_seller or not clean_name.startswith(clean_seller):
        return clean_name

    remainder = clean_name[len(clean_seller) :].strip()
    if not remainder:
        return clean_name
    if remainder.startswith(("-", "–", "—", "|")):
        return f"{clean_seller} {remainder}"
    return f"{clean_seller} - {remainder}"


def _display_name(node_name: str) -> str:
    """Maps internal node names to display-friendly agent names."""
    return {
        "need_analyzer_second_pass": "need_analyzer",
        "parallel_analysis": "parallel_analysis",
    }.get(node_name, node_name)


def _extract_summary(node_name: str, output: dict) -> str:
    """Tries to produce a human-readable summary from a node's output dict."""
    try:
        if node_name == "product_context":
            pc = output.get("product_context_output") or {}
            return pc.get("structured_name") or "Ürün yapılandırıldı"
        if node_name in ("need_analyzer", "need_analyzer_second_pass"):
            na = output.get("need_analyzer_output") or {}
            q_count = len(na.get("questions") or [])
            return f"{q_count} soru üretildi"
        if node_name == "verdict":
            vo = output.get("verdict_output") or {}
            return f"Karar: {vo.get('verdict', '?')}"
        if node_name == "tone_writer":
            tw = output.get("tone_writer_output") or {}
            return tw.get("headline") or "Mesaj hazırlandı"
    except Exception:  # noqa: BLE001
        pass
    return "Tamamlandı"


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline runner (background task)
# ─────────────────────────────────────────────────────────────────────────────


def _is_gemini_timeout(exc: Exception) -> bool:
    message = str(exc).lower()
    exc_name = exc.__class__.__name__.lower()
    return "gemini" in message and ("timeout" in message or "timed out" in message or "deadline" in message or "timeouterror" in exc_name)


def _fallback_timeout_result() -> dict[str, Any]:
    return {
        "verdict_output": {
            "verdict": "wait",
            "confidence_score": 50,
            "score_breakdown": {},
            "primary_reason": "Gemini API timeout nedeniyle güvenli bekleme kararı üretildi.",
            "suggested_action": "Biraz sonra tekrar dene.",
        },
        "tone_writer_output": {
            "headline": "Analiz zaman aşımına uğradı",
            "body": ("Gemini API yanıtı zamanında dönmedi. Güvenli tarafta kalmak için bu kararı şimdi vermemeni öneriyorum."),
            "suggested_action": "Biraz sonra tekrar dene.",
        },
        "agent_traces": [],
    }


async def _require_owner(record: decision_store.DecisionRecord, request: Request) -> str:
    user_id = await get_user_id(request)
    if user_id != record.user_id:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "DECISION_FORBIDDEN",
                    "message": "Bu karar kaydına erişim yetkin yok.",
                }
            },
        )
    return user_id


async def _run_pipeline(decision_id: str, initial_state: AgentState) -> None:
    """
    Background task: runs the LangGraph pipeline step-by-step and pushes
    SSE events to the decision's queue.

    Two-phase execution:
      Phase 1: Run graph → pauses if need_analyzer emits questions
      Phase 2: Resume after user answers are injected (or skip if no questions)
    """
    from agents.orchestrator import graph

    record = decision_store.get(decision_id)
    if record is None:
        logger.warning("_run_pipeline: record not found for %s", decision_id)
        return

    config = {"configurable": {"thread_id": decision_id}}
    node_start_times: dict[str, float] = {}
    # Tracks how many agent_traces existed before parallel_analysis ran
    traces_before_parallel: int = 0

    async def push(event: str, data: Any) -> None:
        await record.sse_queue.put(_sse_item(event, data))

    async def emit_timeout_fallback(exc: Exception) -> None:
        await push(
            "error",
            {
                "message": str(exc),
                "recoverable": True,
                "fallback": "wait",
            },
        )
        record.result = _fallback_timeout_result()
        record.status = "completed"

        fallback_verdict = record.result["verdict_output"]
        fallback_tone = record.result["tone_writer_output"]
        await push(
            "verdict",
            {
                "verdict": fallback_verdict["verdict"],
                "score": fallback_verdict["confidence_score"],
                "score_breakdown": fallback_verdict["score_breakdown"],
                "headline": fallback_tone["headline"],
                "body": fallback_tone["body"],
                "suggested_action": fallback_tone["suggested_action"],
            },
        )
        await push("trace", {"traces": []})
        await push("done", {})

    async def stream_phase(input_state: AgentState | None) -> Exception | None:
        """
        Streams one phase of the graph using astream_events.
        Catches any exception (including GraphInterrupt from interrupt_before)
        so that we can check aget_state afterwards.
        """
        nonlocal traces_before_parallel

        try:
            async for event in graph.astream_events(input_state, config, version="v2"):
                kind = event.get("event", "")
                name = event.get("name", "")

                # ── Node started ──────────────────────────────────────────────
                if kind == "on_chain_start" and name in _AGENT_NODES:
                    node_start_times[name] = time.time()

                    # Track trace count just before parallel analysis begins
                    if name == "parallel_analysis":
                        gs = await graph.aget_state(config)
                        traces_before_parallel = len(gs.values.get("agent_traces") or [])

                    display = _display_name(name)
                    await push("agent_start", {"agent": display, "timestamp": _now()})

                # ── Node completed ────────────────────────────────────────────
                elif kind == "on_chain_end" and name in _AGENT_NODES:
                    t0 = node_start_times.pop(name, time.time())
                    duration_ms = int((time.time() - t0) * 1000)
                    out: dict = event.get("data", {}).get("output") or {}
                    display = _display_name(name)

                    if name == "parallel_analysis":
                        # Emit one event per sub-agent using the traces they appended
                        all_traces: list[dict] = out.get("agent_traces") or []
                        new_traces = all_traces[traces_before_parallel:]
                        if new_traces:
                            for trace in new_traces:
                                await push(
                                    "agent_complete",
                                    {
                                        "agent": trace.get("agent", "unknown"),
                                        "duration_ms": trace.get("duration_ms"),
                                        "summary": trace.get("output_summary", "Tamamlandı"),
                                    },
                                )
                        else:
                            # Fallback: single combined event
                            await push(
                                "agent_complete",
                                {
                                    "agent": "parallel_analysis",
                                    "duration_ms": duration_ms,
                                    "summary": "Paralel analiz tamamlandı",
                                },
                            )
                    else:
                        summary = _extract_summary(name, out)
                        await push(
                            "agent_complete",
                            {
                                "agent": display,
                                "duration_ms": duration_ms,
                                "summary": summary,
                            },
                        )

        except GraphInterrupt as exc:
            logger.debug("stream_phase interrupted: %s", exc)
            return None
        except Exception as exc:  # noqa: BLE001
            logger.exception("stream_phase failed for decision %s", decision_id)
            return exc

        return None

    # ─────────────────────────────────────────────────────────────────────────
    try:
        # ── Phase 1 ──────────────────────────────────────────────────────────
        phase_error = await stream_phase(initial_state)
        if phase_error is not None:
            if _is_gemini_timeout(phase_error):
                await emit_timeout_fallback(phase_error)
                return
            raise phase_error

        # Check if graph paused waiting for user answers
        graph_state = await graph.aget_state(config)
        is_paused: bool = bool(graph_state.next and "need_analyzer_second_pass" in graph_state.next)

        if is_paused:
            need_out: dict = graph_state.values.get("need_analyzer_output") or {}
            questions: list = need_out.get("questions") or []

            await push("questions", {"questions": questions, "decision_id": decision_id})
            record.status = "waiting_answers"

            # Wait for the /answer endpoint to call answer_event.set()
            try:
                await asyncio.wait_for(record.answer_event.wait(), timeout=_ANSWER_TIMEOUT_S)
            except asyncio.TimeoutError:
                await push("error", {"message": "Cevap bekleme süresi doldu (5 dakika)"})
                record.status = "failed"
                return

            # Inject real answers into the LangGraph checkpoint
            await graph.aupdate_state(
                config,
                {"user_answers": record.user_answers, "cycle_iteration": 1},
            )
            record.status = "running"

            # ── Phase 2: resume ───────────────────────────────────────────────
            phase_error = await stream_phase(None)
            if phase_error is not None:
                if _is_gemini_timeout(phase_error):
                    await emit_timeout_fallback(phase_error)
                    return
                raise phase_error

        # ── Build final result from checkpoint ───────────────────────────────
        final_gs = await graph.aget_state(config)
        state_values: dict = final_gs.values

        verdict_out: dict = state_values.get("verdict_output") or {}
        tone_out: dict = state_values.get("tone_writer_output") or {}
        traces: list = state_values.get("agent_traces") or []

        if not verdict_out or not tone_out:
            raise RuntimeError("Pipeline finished without verdict or tone output")

        record.result = {
            "verdict_output": verdict_out,
            "tone_writer_output": tone_out,
            "agent_traces": traces,
        }
        record.status = "completed"

        # ── Persist to Supabase (non-blocking, errors are silent) ─────────────
        await _save_to_supabase(record, state_values, verdict_out, tone_out, traces)

        # ── Emit verdict ──────────────────────────────────────────────────────
        await push(
            "verdict",
            {
                "verdict": verdict_out.get("verdict", "wait"),
                "score": verdict_out.get("confidence_score", 50),
                "score_breakdown": verdict_out.get("score_breakdown", {}),
                "headline": tone_out.get("headline", "Analiz tamamlandı"),
                "body": tone_out.get("body", ""),
                "suggested_action": (tone_out.get("suggested_action") or verdict_out.get("suggested_action")),
            },
        )

        # ── Emit full trace ───────────────────────────────────────────────────
        await push("trace", {"traces": traces})

        # ── Signal stream end ─────────────────────────────────────────────────
        await push("done", {})

    except Exception as exc:  # noqa: BLE001
        logger.exception("Pipeline failed for decision %s", decision_id)
        record.status = "failed"
        try:
            await push("error", {"message": str(exc)})
            await push("done", {})
        except Exception:  # noqa: BLE001
            pass
    finally:
        # Sentinel value — tells the SSE generator to close the connection
        await record.sse_queue.put(None)


# ─────────────────────────────────────────────────────────────────────────────
# SSE event generator
# ─────────────────────────────────────────────────────────────────────────────


async def _event_stream(decision_id: str, request: Request) -> AsyncGenerator[dict, None]:
    """
    Reads SSE events from the decision's queue and yields them.
    Sends a keepalive comment every second while waiting.
    Terminates when it receives the None sentinel or the client disconnects.
    """
    record = decision_store.get(decision_id)
    if record is None:
        yield _sse_item("error", {"message": f"Decision '{decision_id}' not found"})
        return

    while True:
        if await request.is_disconnected():
            logger.debug("Client disconnected for decision %s", decision_id)
            break

        try:
            item = await asyncio.wait_for(record.sse_queue.get(), timeout=_QUEUE_TIMEOUT_S)
        except asyncio.TimeoutError:
            # Send a comment to keep the HTTP connection alive
            yield {"comment": "keepalive"}
            continue

        if item is None:
            # Sentinel: pipeline finished, close stream
            break

        yield item


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/analyze")
async def analyze(
    request_data: DecisionRequest,
    request: Request,
) -> EventSourceResponse:
    """
    Starts a decision analysis and returns an SSE stream.

    Stream events (in order):
      agent_start      → {"agent": "...", "timestamp": "..."}
      agent_complete   → {"agent": "...", "duration_ms": N, "summary": "..."}
      questions        → {"questions": [...], "decision_id": "..."} (pauses stream)
      verdict          → {"verdict": "...", "score": N, "headline": "...", "body": "..."}
      trace            → {"traces": [...]}
      done             → {}
      error            → {"message": "..."} (on failure)
    """
    user_id = await get_user_id(request)
    decision_id = f"dec_{uuid.uuid4().hex[:12]}"

    # Canonical product URL (used for store + logging; product.url takes precedence)
    product_url: str = request_data.product.url if request_data.product is not None else (request_data.product_url or "")

    decision_store.create(
        decision_id=decision_id,
        user_id=user_id,
        mode=request_data.mode,
        product_url=product_url,
    )

    initial_state: AgentState = {
        # Product info — defaults; product_context agent fills / overrides these
        "product_name": "Unknown Product",
        "product_category": "electronics",
        "product_subcategory": "",
        "product_price": 0.0,
        "product_brand": "",
        "product_url": product_url,
        "product_description": "",
        "product_specs": {},
        "product_reviews": [],
        # User context
        "user_id": user_id,
        "mode": request_data.mode,
        "monthly_budget": None,
        "past_purchases": [],
        "session_context": {},
        # Agent outputs (empty at start; pre-filled below when extension sends data)
        "product_context_output": None,
        "review_risk_output": None,
        "behavior_profile_output": None,
        "need_analyzer_output": None,
        "user_answers": {},
        "budget_guard_output": None,
        "verdict_output": None,
        "tone_writer_output": None,
        # Cycle control
        "cycle_iteration": 0,
        "max_cycles": 2,
        "needs_another_cycle": False,
        # Metadata
        "started_at": datetime.now(timezone.utc).isoformat(),
        "agent_traces": [],
    }

    # ── Fast path: extension sent scraped product data ────────────────────────
    # Pre-populate state so product_context agent skips HTTP fetch + Gemini
    # (saves ~36-41 seconds of re-scraping Trendyol)
    if request_data.product is not None:
        p = request_data.product
        price = p.price or 0.0
        specs = dict(p.specs)
        product_name = _display_product_name(p.name, p.seller)
        initial_state.update(
            {
                "product_name": product_name,
                "product_category": p.category or "electronics",
                "product_price": price,
                "product_specs": specs,
                "product_reviews": [
                    {
                        "rating": review.rating,
                        "text": review.text,
                        "date": review.date,
                        "verified_buyer": review.verified_buyer,
                    }
                    for review in p.reviews
                ],
                "product_context_output": {
                    "structured_name": product_name,
                    "category_normalized": p.category or "electronics",
                    "subcategory": "",
                    "price_segment": _price_segment(price),
                    "key_features": [f"{k}: {v}" for k, v in specs.items()][:5],
                    "use_case_hints": [],
                    # Extra fields available to downstream agents
                    "seller": p.seller,
                    "rating": p.rating,
                    "review_count": p.review_count,
                },
            }
        )

    # Use asyncio.create_task so the pipeline runs concurrently with the SSE
    # generator.  BackgroundTasks would only start AFTER the response is fully
    # sent, causing a deadlock with the queue-based SSE stream.
    asyncio.create_task(_run_pipeline(decision_id, initial_state))

    return EventSourceResponse(_event_stream(decision_id, request))


@router.post("/{decision_id}/answer")
async def answer_questions(decision_id: str, body: AnswerRequest, request: Request) -> dict:
    """
    Submits answers to Need Analyzer questions and resumes the SSE stream.
    The same SSE connection started by /analyze will continue with verdict events.
    """
    record = decision_store.get(decision_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "DECISION_NOT_FOUND",
                    "message": f"Decision '{decision_id}' not found",
                }
            },
        )

    await _require_owner(record, request)

    if record.status != "waiting_answers":
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "NOT_WAITING_ANSWERS",
                    "message": (f"Decision is in status '{record.status}', not waiting for answers"),
                }
            },
        )

    record.user_answers = body.answers
    record.answer_event.set()

    return {"ok": True, "decision_id": decision_id, "answers_received": len(body.answers)}


@router.get("/{decision_id}")
async def get_decision(decision_id: str, request: Request) -> dict:
    """
    Returns the completed decision object.
    404 if not found or pipeline not yet finished.
    """
    record = decision_store.get(decision_id)
    if record is None or record.result is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "DECISION_NOT_FOUND",
                    "message": (f"Decision '{decision_id}' not found or not yet complete. Current status: {record.status if record else 'unknown'}"),
                }
            },
        )

    await _require_owner(record, request)

    verdict_out: dict = record.result.get("verdict_output") or {}
    tone_out: dict = record.result.get("tone_writer_output") or {}
    traces: list = record.result.get("agent_traces") or []

    return {
        "decision_id": decision_id,
        "user_id": record.user_id,
        "created_at": record.created_at.isoformat(),
        "product_url": record.product_url,
        "mode_used": record.mode,
        "status": record.status,
        "verdict": verdict_out.get("verdict"),
        "confidence_score": verdict_out.get("confidence_score"),
        "score_breakdown": verdict_out.get("score_breakdown", {}),
        "primary_reason": verdict_out.get("primary_reason", ""),
        "headline": tone_out.get("headline", ""),
        "body": tone_out.get("body", ""),
        "suggested_action": (tone_out.get("suggested_action") or verdict_out.get("suggested_action")),
        "agent_traces": traces,
    }


@router.get("/{decision_id}/trace")
async def get_trace(decision_id: str, request: Request) -> dict:
    """
    Returns only the agent_traces array for the given decision.
    404 if not found.
    """
    record = decision_store.get(decision_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "DECISION_NOT_FOUND",
                    "message": f"Decision '{decision_id}' not found",
                }
            },
        )

    await _require_owner(record, request)

    traces: list = []
    if record.result:
        traces = record.result.get("agent_traces") or []

    return {
        "decision_id": decision_id,
        "status": record.status,
        "traces": traces,
        "trace_count": len(traces),
    }
