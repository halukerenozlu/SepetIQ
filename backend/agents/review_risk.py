"""
Review Risk Analyzer Agent
--------------------------
Ürün yorumlarını analiz ederek satın alma riskini ölçer.
Gemini'ye tek seferde tüm yorumları gönderir, yapılandırılmış risk skoru döner.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Literal

from dotenv import find_dotenv, load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from models.state import AgentState

load_dotenv(find_dotenv(usecwd=False))

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic şemaları — Gemini structured output için
# ---------------------------------------------------------------------------


class RiskFactor(BaseModel):
    topic: str = Field(description="Risk topic category")
    severity: Literal["low", "medium", "high"] = Field(description="Severity level")
    affected_rate: float = Field(description="Share of reviews mentioning this issue, 0.0-1.0")
    sample_quote: str = Field(description="Short paraphrase from a review in Turkish")
    triggers_need_recheck: bool = Field(description="True only when severity is high")


class ReviewRiskExtraction(BaseModel):
    risk_score: int = Field(description="Overall risk score 0 (safe) to 100 (very risky)")
    positive_rate: float = Field(description="Share of 4-5 star reviews, 0.0-1.0")
    risk_factors: list[RiskFactor] = Field(
        default_factory=list,
        description="List of detected risk factors with affected_rate >= 0.10",
    )
    summary: str = Field(description="1-2 sentence human-readable summary in Turkish")


# ---------------------------------------------------------------------------
# Sistem & kullanıcı prompt şablonları
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are a product review risk analyzer for an AI shopping assistant. "
    "Analyze the given product reviews and return a JSON risk assessment. "
    "Focus on recurring complaints, not one-off issues. "
    "Respond ONLY with valid JSON. No markdown, no explanation."
)

_USER_PROMPT_TEMPLATE = """\
Product: {product_name} (Category: {category})
Total reviews: {count}
Reviews:
{formatted_reviews}

Return JSON with this exact structure:
{{
  "risk_score": <int 0-100>,
  "positive_rate": <float>,
  "risk_factors": [
    {{
      "topic": "<string>",
      "severity": "<low|medium|high>",
      "affected_rate": <float>,
      "sample_quote": "<short paraphrase in Turkish>",
      "triggers_need_recheck": <bool>
    }}
  ],
  "summary": "<1-2 sentences in Turkish>"
}}

Rules:
- risk_score: higher = more risky. Weight severity: high=+30, medium=+15, low=+5
- triggers_need_recheck=true only when severity is "high"
- Detect topics from: battery_life, build_quality, performance, delivery, seller_response, value_for_money, software_bugs, size_fit, durability
- Only include risk_factors with affected_rate >= 0.10 (at least 10% of reviews)
- If reviews are overwhelmingly positive (positive_rate > 0.85), return empty risk_factors and risk_score <= 20
"""

# ---------------------------------------------------------------------------
# Lazy-initialized LangChain structured chain
# ---------------------------------------------------------------------------

_structured_chain = None


def _get_chain():
    global _structured_chain
    if _structured_chain is None:
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")
        _structured_chain = llm.with_structured_output(ReviewRiskExtraction)
    return _structured_chain


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------


def _confidence_from_count(count: int) -> int:
    if count == 0:
        return 0
    if count < 5:
        return 30
    if count < 20:
        return 60
    if count < 50:
        return 80
    return 95


def _select_reviews(reviews: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    30'dan fazla yorum varsa:
    - İlk 10
    - Son 10
    - En son 10 negatif yorum (rating < 4, tarih desc)
    Tekrar eden indexleri atlar.
    """
    if len(reviews) <= 30:
        return reviews

    seen_indices: set[int] = set()
    selected: list[dict[str, Any]] = []

    def add(idx: int) -> None:
        if idx not in seen_indices:
            seen_indices.add(idx)
            selected.append(reviews[idx])

    # İlk 10
    for i in range(min(10, len(reviews))):
        add(i)

    # Son 10
    for i in range(max(0, len(reviews) - 10), len(reviews)):
        add(i)

    # En son 10 negatif yorum
    negative_indices = [i for i, r in enumerate(reviews) if (r.get("rating") or 5) < 4]
    try:
        negative_indices.sort(key=lambda i: reviews[i].get("date") or "", reverse=True)
    except Exception:
        pass

    for i in negative_indices[:10]:
        add(i)

    return selected


def _format_reviews(reviews: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for i, r in enumerate(reviews, start=1):
        rating = r.get("rating", "?")
        text = (r.get("text") or "").strip()
        lines.append(f"{i}. [{rating}/5] {text}")
    return "\n".join(lines)


def _fallback(summary: str, review_count: int = 0) -> dict[str, Any]:
    return {
        "risk_score": 50,
        "confidence": 0,
        "review_count": review_count,
        "positive_rate": 0.0,
        "risk_factors": [],
        "summary": summary,
        "triggers_need_recheck": False,
    }


# ---------------------------------------------------------------------------
# Ana ajan fonksiyonu
# ---------------------------------------------------------------------------


async def run(state: AgentState) -> dict:
    started = time.monotonic()

    product_name: str = state.get("product_name") or "Bilinmeyen Ürün"
    category: str = state.get("product_category") or "electronics"
    reviews: list[dict[str, Any]] = state.get("product_reviews") or []
    review_count = len(reviews)

    # Yorum yoksa güvenli fallback döndür
    if not reviews:
        duration_ms = int((time.monotonic() - started) * 1000)
        traces = list(state.get("agent_traces") or [])
        traces.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent": "review_risk",
                "status": "completed",
                "duration_ms": duration_ms,
                "input_summary": "0 yorum analiz edildi",
                "output_summary": "Risk skoru: 50/100, 0 risk faktörü",
                "key_findings": [],
                "triggered_actions": [],
            }
        )
        result = _fallback("Bu ürün için yorum bulunamadı.", review_count=0)
        return {"review_risk_output": result, "agent_traces": traces}

    # 30'dan fazla yorum varsa akıllıca seç
    selected = _select_reviews(reviews)
    formatted = _format_reviews(selected)

    user_prompt = _USER_PROMPT_TEMPLATE.format(
        product_name=product_name,
        category=category,
        count=review_count,
        formatted_reviews=formatted,
    )

    extracted: ReviewRiskExtraction | None = None
    from utils.gemini_client import invoke_with_retry

    messages = [
        ("system", _SYSTEM_PROMPT),
        ("human", user_prompt),
    ]
    extracted = await invoke_with_retry(
        _get_chain(),
        messages,
        fallback=None,
        agent_name="review_risk",
    )

    if extracted is None:
        duration_ms = int((time.monotonic() - started) * 1000)
        traces = list(state.get("agent_traces") or [])
        traces.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent": "review_risk",
                "status": "failed",
                "duration_ms": duration_ms,
                "input_summary": f"{review_count} yorum analiz edildi",
                "output_summary": "Gemini çağrısı başarısız, fallback kullanıldı",
                "key_findings": [],
                "triggered_actions": [],
            }
        )
        result = _fallback("Yorum analizi yapılamadı.", review_count=review_count)
        return {"review_risk_output": result, "agent_traces": traces}

    # Confidence Python tarafında hesaplanır (Gemini'ye bırakılmaz)
    confidence = _confidence_from_count(review_count)

    risk_factors = [
        {
            "topic": f.topic,
            "severity": f.severity,
            "affected_rate": f.affected_rate,
            "sample_quote": f.sample_quote,
            "triggers_need_recheck": f.triggers_need_recheck,
        }
        for f in (extracted.risk_factors or [])
    ]

    triggers_need_recheck = any(f["triggers_need_recheck"] for f in risk_factors)

    result: dict[str, Any] = {
        "risk_score": max(0, min(100, int(extracted.risk_score))),
        "confidence": confidence,
        "review_count": review_count,
        "positive_rate": float(extracted.positive_rate),
        "risk_factors": risk_factors,
        "summary": extracted.summary,
        "triggers_need_recheck": triggers_need_recheck,
    }

    duration_ms = int((time.monotonic() - started) * 1000)
    traces = list(state.get("agent_traces") or [])
    traces.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": "review_risk",
            "status": "completed",
            "duration_ms": duration_ms,
            "input_summary": f"{review_count} yorum analiz edildi",
            "output_summary": f"Risk skoru: {result['risk_score']}/100, {len(risk_factors)} risk faktörü",
            "key_findings": [f["topic"] + ": " + f["severity"] for f in risk_factors],
            "triggered_actions": ["need_analyzer_recheck"] if triggers_need_recheck else [],
        }
    )

    return {"review_risk_output": result, "agent_traces": traces}
