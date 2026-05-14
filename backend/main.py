from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import AgentTrace, DecisionRequest, DecisionResponse
from models.state import AgentState

logger = logging.getLogger(__name__)

app = FastAPI(
    title="SepetIQ API",
    version="0.1.0",
    description=(
        "Agentic AI alışveriş danışmanı — ürün önerisi değil, "
        "sorgulaması."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "project": "SepetIQ"}


@app.get("/api/v1/health")
def health():
    return {
        "status": "healthy",
        "version": "0.1.0",
        "dependencies": {
            "database": "not_configured",
            "gemini_api": "not_configured",
            "langgraph": "ok",
        },
    }


@app.post("/api/v1/decision", response_model=DecisionResponse)
async def analyze_decision(request: DecisionRequest) -> DecisionResponse:
    """
    Ürün analizi başlatır: 7 ajan sırayla çalışır ve karar üretir.
    """
    from agents.orchestrator import graph

    thread_id = str(uuid.uuid4())

    initial_state: AgentState = {
        # Product info (product_context agent URL'den çekip doldurur)
        "product_name": "Unknown Product",
        "product_category": "electronics",
        "product_subcategory": "",
        "product_price": 0.0,
        "product_brand": "",
        "product_url": request.product_url,
        "product_description": "",
        "product_specs": {},
        "product_reviews": [],
        # User context
        "user_id": request.user_id,
        "mode": request.mode,
        "monthly_budget": None,
        "past_purchases": [],
        "session_context": {},
        # Agent outputs (boş başlar)
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

    try:
        config = {"configurable": {"thread_id": thread_id}}
        t_total = time.time()
        result = await graph.ainvoke(initial_state, config=config)
        logger.info("[TIMING] total pipeline: %.2fs", time.time() - t_total)

        verdict_out = result.get("verdict_output") or {}
        tone_out = result.get("tone_writer_output") or {}
        raw_traces = result.get("agent_traces") or []

        agent_traces = [
            AgentTrace(
                agent_name=t.get("agent", "unknown"),
                status=t.get("status", "completed"),
                duration_ms=t.get("duration_ms"),
                key_findings=t.get("key_findings") or [],
            )
            for t in raw_traces
        ]

        return DecisionResponse(
            verdict=verdict_out.get("verdict", "wait"),
            confidence_score=verdict_out.get("confidence_score", 50),
            score_breakdown=verdict_out.get("score_breakdown", {}),
            primary_reason=verdict_out.get("primary_reason", ""),
            flags=verdict_out.get("flags", []),
            headline=tone_out.get("headline", "Analiz tamamlandı."),
            body=tone_out.get("body", ""),
            suggested_action=(
                tone_out.get("suggested_action")
                or verdict_out.get("suggested_action", "")
            ),
            agent_traces=agent_traces,
        )

    except Exception as exc:  # noqa: BLE001
        logger.exception("Decision analysis failed", exc_info=exc)
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DECISION_ANALYSIS_UNAVAILABLE",
                "message": (
                    "Analiz geçici olarak kullanılamıyor. "
                    "Lütfen tekrar deneyin."
                ),
            },
        ) from exc
