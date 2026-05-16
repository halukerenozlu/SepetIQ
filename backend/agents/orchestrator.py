"""
Orchestrator — LangGraph StateGraph
-------------------------------------
Ajan akışı:
  product_context
    → parallel_analysis  (review_risk + behavior_profile + budget_guard, asyncio.gather)
    → need_analyzer
    → [should_continue] → need_analyzer_second_pass  (awaiting_answers=True ise)
                       → verdict
    → tone_writer
    → END
"""

from __future__ import annotations

import asyncio
import logging
import time

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from agents import (
    behavior_profile,
    budget_guard,
    need_analyzer,
    product_context,
    review_risk,
    tone_writer,
    verdict,
)
from models.state import AgentState

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Node wrappers
# ---------------------------------------------------------------------------


async def product_context_node(state: AgentState) -> dict:
    t0 = time.time()
    result = await product_context.run(state)
    logger.info("[TIMING] product_context: %.2fs", time.time() - t0)
    return result


async def _staggered_run(coro_func, state: AgentState, delay: float):
    """Run an agent coroutine after a delay to avoid Gemini RPM limits."""
    if delay > 0:
        await asyncio.sleep(delay)
    return await coro_func(state)


async def parallel_analysis_node(state: AgentState) -> dict:
    t0 = time.time()
    base_trace_count = len(state.get("agent_traces") or [])

    # Stagger Gemini calls: 0s, 2s, 4s to stay within 15 RPM free tier
    results = await asyncio.gather(
        _staggered_run(review_risk.run, state, 0),
        _staggered_run(behavior_profile.run, state, 2),
        _staggered_run(budget_guard.run, state, 4),
        return_exceptions=True,
    )

    merged: dict = {}
    new_traces: list = []

    for res in results:
        if isinstance(res, Exception):
            logger.warning("Parallel agent failed: %s", res)
        elif isinstance(res, dict):
            if "agent_traces" in res:
                # Only take traces added by this agent (after base)
                agent_traces = res.pop("agent_traces")
                if len(agent_traces) > base_trace_count:
                    new_traces.extend(agent_traces[base_trace_count:])
            merged.update(res)

    # Combine: original traces + only new ones from parallel agents
    merged["agent_traces"] = list(state.get("agent_traces") or []) + new_traces
    logger.info("[TIMING] parallel_analysis: %.2fs", time.time() - t0)
    return merged


async def need_analyzer_node(state: AgentState) -> dict:
    t0 = time.time()
    result = await need_analyzer.run(state)
    logger.info("[TIMING] need_analyzer: %.2fs", time.time() - t0)
    return result


async def need_analyzer_second_pass_node(state: AgentState) -> dict:
    t0 = time.time()
    # user_answers and cycle_iteration are injected via aupdate_state before resume
    result = await need_analyzer.run(state)
    logger.info("[TIMING] need_analyzer_second_pass: %.2fs", time.time() - t0)
    return result


async def verdict_node(state: AgentState) -> dict:
    t0 = time.time()
    result = await verdict.run(state)
    logger.info("[TIMING] verdict: %.2fs", time.time() - t0)
    return result


async def tone_writer_node(state: AgentState) -> dict:
    t0 = time.time()
    result = await tone_writer.run(state)
    logger.info("[TIMING] tone_writer: %.2fs", time.time() - t0)
    return result


# ---------------------------------------------------------------------------
# Cyclic flow — conditional edge function
# ---------------------------------------------------------------------------


def should_continue(state: AgentState) -> str:
    need_out = state.get("need_analyzer_output") or {}
    cycle = state.get("cycle_iteration") or 0

    if need_out.get("awaiting_answers", False) and cycle < 1:
        return "second_pass"
    return "verdict"


# ---------------------------------------------------------------------------
# Graph definition
# ---------------------------------------------------------------------------


def _build_graph() -> StateGraph:
    workflow = StateGraph(AgentState)

    workflow.add_node("product_context", product_context_node)
    workflow.add_node("parallel_analysis", parallel_analysis_node)
    workflow.add_node("need_analyzer", need_analyzer_node)
    workflow.add_node("need_analyzer_second_pass", need_analyzer_second_pass_node)
    workflow.add_node("verdict", verdict_node)
    workflow.add_node("tone_writer", tone_writer_node)

    workflow.set_entry_point("product_context")
    workflow.add_edge("product_context", "parallel_analysis")
    workflow.add_edge("parallel_analysis", "need_analyzer")

    workflow.add_conditional_edges(
        "need_analyzer",
        should_continue,
        {
            "second_pass": "need_analyzer_second_pass",
            "verdict": "verdict",
        },
    )
    workflow.add_edge("need_analyzer_second_pass", "verdict")

    workflow.add_edge("verdict", "tone_writer")
    workflow.add_edge("tone_writer", END)

    return workflow


checkpointer = MemorySaver()
graph = _build_graph().compile(
    checkpointer=checkpointer,
    # Pause before second pass so the API can inject real user answers
    interrupt_before=["need_analyzer_second_pass"],
)
