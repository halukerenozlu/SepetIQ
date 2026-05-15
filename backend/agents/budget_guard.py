"""
Budget Guard Agent
------------------
Saf Python — Gemini çağrısı yok.
Ürün fiyatını kullanıcının aylık bütçesi ve geçmiş harcama alışkanlıklarıyla karşılaştırır,
finansal risk sinyali üretir.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from models.state import AgentState


# ---------------------------------------------------------------------------
# Yardımcı: tarih parse
# ---------------------------------------------------------------------------


def _parse_date(p: dict[str, Any]) -> datetime:
    raw = p.get("purchase_date") or p.get("purchased_at") or ""
    try:
        return datetime.fromisoformat(str(raw))
    except Exception:
        return datetime(2000, 1, 1)


# ---------------------------------------------------------------------------
# Ana ajan fonksiyonu
# ---------------------------------------------------------------------------


async def run(state: AgentState) -> dict:
    started = time.monotonic()

    product_price: float = float(state.get("product_price") or 0.0)
    monthly_budget: float = float(state.get("monthly_budget") or 0.0)
    past_purchases: list[dict[str, Any]] = state.get("past_purchases") or []
    mode: str = state.get("mode") or "balanced"
    behavior_profile: dict[str, Any] = state.get("behavior_profile_output") or {}

    price_vs_average: float = float(behavior_profile.get("current_price_ratio") or 0.0)

    # ------------------------------------------------------------------
    # Adım 1: Bu ay harcanan
    # ------------------------------------------------------------------
    now = datetime.now()
    spent_this_month: float = sum(float(p.get("price") or 0.0) for p in past_purchases if _parse_date(p).year == now.year and _parse_date(p).month == now.month)

    # ------------------------------------------------------------------
    # Adım 2: Bütçe kalan ve kullanım oranı
    # ------------------------------------------------------------------
    if monthly_budget > 0:
        budget_remaining = max(0.0, monthly_budget - spent_this_month)
        budget_utilization = product_price / monthly_budget
    else:
        budget_remaining = 0.0
        budget_utilization = 0.0

    # ------------------------------------------------------------------
    # Adım 3: Finansal risk seviyesi
    # ------------------------------------------------------------------
    if monthly_budget == 0:
        if price_vs_average >= 2.0:
            financial_risk = "high"
            risk_reason = "Ürün fiyatı, geçmiş ortalama harcamanın 2 katından fazla."
        elif price_vs_average >= 1.5:
            financial_risk = "medium"
            risk_reason = "Ürün fiyatı geçmiş ortalamanın belirgin üzerinde."
        elif price_vs_average == 0.0:
            financial_risk = "unknown"
            risk_reason = "Bütçe bilgisi ve geçmiş harcama verisi bulunamadı."
        else:
            financial_risk = "low"
            risk_reason = "Ürün fiyatı geçmiş harcama alışkanlıklarıyla uyumlu."
    else:
        if budget_utilization >= 0.5 or budget_remaining < product_price:
            financial_risk = "high"
            risk_reason = f"Ürün fiyatı ({product_price:.0f} TL) aylık bütçenin %{budget_utilization * 100:.0f}'ini oluşturuyor."
        elif budget_utilization >= 0.25:
            financial_risk = "medium"
            risk_reason = f"Ürün fiyatı aylık bütçenin çeyreğinden fazla; kalan bütçe: {budget_remaining:.0f} TL."
        else:
            financial_risk = "low"
            risk_reason = f"Ürün fiyatı bütçeyle uyumlu; kalan bütçe: {budget_remaining:.0f} TL."

    # ------------------------------------------------------------------
    # Adım 4: blocks_purchase
    # ------------------------------------------------------------------
    blocks_purchase = mode == "strict" and financial_risk == "high"

    # ------------------------------------------------------------------
    # Adım 5: Strict modda risk_reason'a ek uyarı
    # ------------------------------------------------------------------
    if mode == "strict" and financial_risk in ("medium", "high"):
        risk_reason += " Disiplinli mod aktif: harcama kontrolü öneriliyor."

    # ------------------------------------------------------------------
    # Çıktı
    # ------------------------------------------------------------------
    result: dict[str, Any] = {
        "product_price": product_price,
        "monthly_budget": monthly_budget,
        "spent_this_month": spent_this_month,
        "budget_remaining": budget_remaining,
        "budget_utilization": budget_utilization,
        "price_vs_average": price_vs_average,
        "financial_risk": financial_risk,
        "risk_reason": risk_reason,
        "blocks_purchase": blocks_purchase,
    }

    duration_ms = int((time.monotonic() - started) * 1000)
    traces = list(state.get("agent_traces") or [])
    traces.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": "budget_guard",
            "status": "completed",
            "duration_ms": duration_ms,
            "input_summary": (f"Ürün fiyatı: {product_price:.0f} TL, aylık bütçe: {monthly_budget:.0f} TL"),
            "output_summary": (f"Finansal risk: {financial_risk}, satın almayı engelliyor: {blocks_purchase}"),
            "key_findings": [
                f"Bu ay harcanan: {spent_this_month:.0f} TL",
                f"Bütçe kullanımı: %{budget_utilization * 100:.0f}",
                f"Fiyat/ortalama oranı: {price_vs_average:.1f}x",
            ],
            "triggered_actions": ["purchase_blocked"] if blocks_purchase else [],
        }
    )

    return {"budget_guard_output": result, "agent_traces": traces}
