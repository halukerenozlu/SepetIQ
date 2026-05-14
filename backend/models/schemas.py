from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class DecisionRequest(BaseModel):
    product_url: str = Field(..., description="URL of the product page")
    user_id: str = Field(..., description="Authenticated user ID")
    mode: Literal["soft", "balanced", "strict"] = Field(
        default="balanced",
        description="Analysis mode: soft / balanced / strict",
    )


class AgentTrace(BaseModel):
    agent_name: str
    status: Literal["started", "completed", "failed"]
    duration_ms: int | None = None
    key_findings: list[str] = Field(default_factory=list)


class DecisionResponse(BaseModel):
    verdict: Literal["buy", "conditional_buy", "wait", "dont_buy", "consider_alternative"]
    confidence_score: int = Field(..., ge=0, le=100, description="Decision confidence 0-100")
    score_breakdown: dict[str, int] = Field(default_factory=dict)
    primary_reason: str = Field(..., description="Primary reason for the verdict")
    flags: list[str] = Field(default_factory=list)
    headline: str = Field(..., description="Short headline shown to user")
    body: str = Field(..., description="Explanatory paragraph (3-4 sentences)")
    suggested_action: str | None = Field(None, description="CTA text, e.g. '24 saat bekle'")
    agent_traces: list[AgentTrace] = Field(default_factory=list)
