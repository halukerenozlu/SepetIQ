"""
Behavior Profile Agent
----------------------
Kullanıcının geçmiş alışveriş geçmişinden davranışsal profil çıkarır.
Tüm sayısal alanlar Python'da hesaplanır; Gemini yalnızca Türkçe özet cümle üretmek için çağrılır.
"""

from __future__ import annotations
import os

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import find_dotenv, load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

from models.state import AgentState

load_dotenv(find_dotenv(usecwd=False))

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-initialized LLM — only for plain-text summary sentence
# ---------------------------------------------------------------------------

_llm = None


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    return _llm


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are a behavioral analyst for a shopping assistant. "
    "Given a user's purchase profile data, write exactly ONE sentence in Turkish "
    "that describes their buying pattern. Be specific, not generic. "
    "Respond with only the sentence, no punctuation at the start, end with a period."
)

_USER_PROMPT_TEMPLATE = """\
Profile data:

Total purchases: {purchase_count}
Category loyalty (same category rate): {category_loyalty_pct}
Return rate: {return_rate_pct}
Impulsivity score: {impulsivity_score}/100
Profile tag: {profile_tag}
Currently looking at: {product_name} ({category}), price {current_price} TL
Their average spend: {avg_price_point:.0f} TL
Bought similar product in last 6 months: {similar_past_purchase}

Write ONE sentence in Turkish describing this user's buying pattern.\
"""

# ---------------------------------------------------------------------------
# Fallback
# ---------------------------------------------------------------------------

_FALLBACK_OUTPUT: dict[str, Any] = {
    "impulsivity_score": 50,
    "category_loyalty": 0.0,
    "avg_price_point": 0.0,
    "current_price_ratio": 0.0,
    "return_rate": 0.0,
    "similar_past_purchase": False,
    "profile_tag": "unknown",
    "profile_summary": "Kullanıcının geçmiş alışveriş verisi bulunamadı.",
}


# ---------------------------------------------------------------------------
# Pure-Python computations
# ---------------------------------------------------------------------------


def _compute_fields(
    past_purchases: list[dict[str, Any]],
    current_category: str,
    current_price: float,
    mode: str,
) -> dict[str, Any]:
    n = len(past_purchases)

    # category_loyalty
    same_category = [p for p in past_purchases if p.get("category") == current_category]
    category_loyalty = len(same_category) / n

    # avg_price_point
    prices = [p.get("price") or 0.0 for p in past_purchases]
    avg_price_point = sum(prices) / n

    # current_price_ratio
    current_price_ratio = (current_price / avg_price_point) if avg_price_point > 0 else 0.0

    # return_rate
    return_rate = sum(1 for p in past_purchases if p.get("was_returned")) / n

    # similar_past_purchase (last 6 months)
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
    similar_past_purchase = False
    for p in past_purchases:
        if p.get("category") != current_category:
            continue
        raw_date = p.get("purchased_at") or p.get("purchase_date") or ""
        try:
            dt = datetime.fromisoformat(raw_date)
            # treat timezone-naive as UTC
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if dt > six_months_ago:
                similar_past_purchase = True
                break
        except (ValueError, TypeError):
            pass

    # impulsivity_score
    score = 50
    if return_rate > 0.3:
        score += 20
    elif return_rate > 0.15:
        score += 10

    if current_price_ratio > 2.0:
        score += 15
    elif current_price_ratio > 1.5:
        score += 8

    if mode == "strict":
        score += 10
    elif mode == "soft":
        score -= 10

    impulsivity_score = max(0, min(100, score))

    # profile_tag
    if impulsivity_score >= 70:
        profile_tag = "impulsive"
    elif category_loyalty >= 0.6:
        profile_tag = "loyal"
    elif return_rate <= 0.05 and n >= 5:
        profile_tag = "researcher"
    elif current_price_ratio < 0.7:
        profile_tag = "bargain_hunter"
    else:
        profile_tag = "unknown"

    if profile_tag == "impulsive" and mode == "strict":
        threshold_adjustment = -15.0
    elif profile_tag == "impulsive":
        threshold_adjustment = -8.0
    elif profile_tag == "researcher":
        threshold_adjustment = 10.0
    else:
        threshold_adjustment = 0.0

    return {
        "impulsivity_score": impulsivity_score,
        "category_loyalty": category_loyalty,
        "avg_price_point": avg_price_point,
        "current_price_ratio": current_price_ratio,
        "return_rate": return_rate,
        "similar_past_purchase": similar_past_purchase,
        "profile_tag": profile_tag,
        "threshold_adjustment": threshold_adjustment,
    }


# ---------------------------------------------------------------------------
# Main agent function
# ---------------------------------------------------------------------------


async def run(state: AgentState) -> dict:
    started = time.monotonic()

    past_purchases: list[dict[str, Any]] = state.get("past_purchases") or []
    user_id: str = state.get("user_id") or ""
    mode: str = state.get("mode") or "balanced"
    product_name: str = state.get("product_name") or "Bilinmeyen Ürün"
    current_category: str = state.get("product_category") or "electronics"
    current_price: float = state.get("product_price") or 0.0

    # Skip entirely if no purchase history
    _is_anonymous = not user_id or user_id.startswith("demo") or user_id == "anonymous"
    if not past_purchases:
        duration_ms = int((time.monotonic() - started) * 1000)
        traces = list(state.get("agent_traces") or [])
        traces.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent": "behavior_profile",
                "status": "completed",
                "duration_ms": duration_ms,
                "input_summary": "0 geçmiş alışveriş analiz edildi",
                "output_summary": "Profil: unknown, dürtüsellik skoru: 50/100",
                "key_findings": [],
                "triggered_actions": [],
            }
        )
        return {
            "behavior_profile_output": dict(_FALLBACK_OUTPUT),
            "agent_traces": traces,
        }

    # Compute numeric fields in Python
    fields = _compute_fields(past_purchases, current_category, current_price, mode)
    impulsivity_score = fields["impulsivity_score"]
    category_loyalty = fields["category_loyalty"]
    return_rate = fields["return_rate"]
    current_price_ratio = fields["current_price_ratio"]
    avg_price_point = fields["avg_price_point"]
    profile_tag = fields["profile_tag"]
    similar_past_purchase = fields["similar_past_purchase"]

    # Ask Gemini to produce a Turkish summary sentence only
    # Skip Gemini for anonymous/demo users — save RPM quota
    profile_summary = "Kullanıcının alışveriş geçmişi analiz edildi."
    if not _is_anonymous:
        from utils.gemini_client import invoke_with_retry

        user_prompt = _USER_PROMPT_TEMPLATE.format(
            purchase_count=len(past_purchases),
            category_loyalty_pct=f"{category_loyalty:.0%}",
            return_rate_pct=f"{return_rate:.0%}",
            impulsivity_score=impulsivity_score,
            profile_tag=profile_tag,
            product_name=product_name,
            category=current_category,
            current_price=current_price,
            avg_price_point=avg_price_point,
            similar_past_purchase=similar_past_purchase,
        )
        messages = [
            ("system", _SYSTEM_PROMPT),
            ("human", user_prompt),
        ]
        response = await invoke_with_retry(
            _get_llm(),
            messages,
            fallback=None,
            agent_name="behavior_profile",
        )
        if response is not None:
            summary_text = (response.content or "").strip()
            if summary_text:
                profile_summary = summary_text

    result: dict[str, Any] = {
        "impulsivity_score": impulsivity_score,
        "category_loyalty": category_loyalty,
        "avg_price_point": avg_price_point,
        "current_price_ratio": current_price_ratio,
        "return_rate": return_rate,
        "similar_past_purchase": similar_past_purchase,
        "profile_tag": profile_tag,
        "profile_summary": profile_summary,
        "threshold_adjustment": fields["threshold_adjustment"],
    }

    duration_ms = int((time.monotonic() - started) * 1000)
    traces = list(state.get("agent_traces") or [])
    traces.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": "behavior_profile",
            "status": "completed",
            "duration_ms": duration_ms,
            "input_summary": f"{len(past_purchases)} geçmiş alışveriş analiz edildi",
            "output_summary": f"Profil: {profile_tag}, dürtüsellik skoru: {impulsivity_score}/100",
            "key_findings": [
                f"Kategori sadakati: {category_loyalty:.0%}",
                f"İade oranı: {return_rate:.0%}",
                f"Fiyat oranı: {current_price_ratio:.1f}x ortalama",
            ],
            "triggered_actions": [],
        }
    )

    return {"behavior_profile_output": result, "agent_traces": traces}
