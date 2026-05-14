from __future__ import annotations

from typing import Any, TypedDict


class AgentTrace(TypedDict):
    timestamp: str
    agent: str
    duration_ms: int | None
    status: str  # "started" | "completed" | "failed"
    input_summary: str | None
    output_summary: str | None
    key_findings: list[str]


class AgentState(TypedDict):
    # --- Product info (set at graph entry, updated by product_context agent) ---
    product_name: str
    product_category: str
    product_subcategory: str
    product_price: float
    product_brand: str
    product_url: str
    product_description: str
    product_specs: dict[str, Any]
    product_reviews: list[dict[str, Any]]

    # --- User context (set at graph entry) ---
    user_id: str
    mode: str  # "soft" | "balanced" | "strict"
    monthly_budget: float | None
    past_purchases: list[dict[str, Any]]
    session_context: dict[str, Any]

    # --- Agent outputs (populated as graph runs) ---
    product_context_output: dict[str, Any] | None
    review_risk_output: dict[str, Any] | None
    behavior_profile_output: dict[str, Any] | None
    need_analyzer_output: dict[str, Any] | None
    user_answers: dict[str, Any] | None
    budget_guard_output: dict[str, Any] | None
    verdict_output: dict[str, Any] | None
    tone_writer_output: dict[str, Any] | None

    # --- Cycle control ---
    cycle_iteration: int
    max_cycles: int
    needs_another_cycle: bool

    # --- Metadata ---
    started_at: str
    agent_traces: list[AgentTrace]
