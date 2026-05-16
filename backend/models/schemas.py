from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ScrapedReviewInput(BaseModel):
    """Review data scraped by the browser extension."""

    rating: int | None = Field(default=None, ge=0, le=5)
    text: str = ""
    date: str | None = None
    verified_buyer: bool = False


class ScrapedProductInput(BaseModel):
    """Product data scraped by the browser extension."""

    url: str
    product_id: str | None = Field(default=None, alias="productId")
    name: str | None = None
    price: float | None = None
    currency: str = "TL"
    rating: float | None = None
    review_count: int | None = Field(default=None, alias="reviewCount")
    seller: str | None = None
    category: str | None = None
    image_url: str | None = Field(default=None, alias="imageUrl")
    specs: dict[str, str] = Field(default_factory=dict)
    reviews: list[ScrapedReviewInput] = Field(default_factory=list)
    source: str = "extension"


class DecisionRequest(BaseModel):
    # Legacy: direct URL (curl/API testing)
    product_url: str | None = None
    # New: pre-scraped product from the extension (skips re-scraping)
    product: ScrapedProductInput | None = None

    user_id: str = "anonymous"
    mode: Literal["soft", "balanced", "strict"] = "balanced"

    @model_validator(mode="after")
    def require_product_or_url(self) -> "DecisionRequest":
        if self.product is None and self.product_url is None:
            raise ValueError("Either 'product' or 'product_url' must be provided")
        return self


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
