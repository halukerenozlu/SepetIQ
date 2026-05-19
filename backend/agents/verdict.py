"""
Verdict Agent  (a.k.a. Decision Agent)
---------------------------------------
Tüm upstream ajan çıktılarını birleştirerek nihai satın alma kararını verir.
Saf Python — Gemini çağrısı yok.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from models.state import AgentState


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------


def _zero_scores() -> dict[str, int]:
    return {
        "product_score": 0,
        "need_score": 0,
        "budget_score": 0,
        "behavior_score": 0,
    }


def _mode_offset(mode: str) -> int:
    if mode == "soft":
        return -10
    if mode == "strict":
        return 10
    return 0


def _clamp_score(value: float, lower: int = 0, upper: int = 100) -> int:
    return max(lower, min(upper, int(round(value))))


def _score_from_ratio(ratio: float) -> int:
    """Maps product_price / budget to a continuous 0-100 affordability score."""
    points: list[tuple[float, float]] = [
        (0.0, 100.0),
        (0.30, 85.0),
        (0.80, 40.0),
        (1.20, 15.0),
        (2.00, 0.0),
    ]

    if ratio <= points[0][0]:
        return int(points[0][1])
    if ratio >= points[-1][0]:
        return int(points[-1][1])

    for (left_ratio, left_score), (right_ratio, right_score) in zip(points, points[1:], strict=True):
        if left_ratio <= ratio <= right_ratio:
            span = right_ratio - left_ratio
            progress = (ratio - left_ratio) / span if span else 0.0
            return _clamp_score(left_score + (right_score - left_score) * progress)

    return 50


def _score_from_monthly_budget(product_price: float, monthly_budget: float) -> int:
    if product_price <= 0 or monthly_budget <= 0:
        return 45

    ratio = product_price / monthly_budget
    if ratio < 0.15:
        return 85
    if ratio < 0.30:
        return 70
    if ratio < 0.50:
        return 55
    if ratio < 0.80:
        return 35
    return 15


def _parse_money_value(raw: str) -> float | None:
    compact = raw.lower().replace("₺", " tl")
    if not any(token in compact for token in ("tl", "bütçe", "butce", "aylık", "aylik", "gelir", "maaş", "maas", "limit")):
        return None

    digits = []
    current = ""
    for char in compact:
        if char.isdigit() or char in "., ":
            current += char
            continue
        if current.strip():
            digits.append(current.strip())
        current = ""
    if current.strip():
        digits.append(current.strip())

    values: list[float] = []
    for candidate in digits:
        normalized = candidate.replace(" ", "")
        if "," in normalized and "." in normalized:
            normalized = normalized.replace(".", "").replace(",", ".")
        elif "," in normalized:
            normalized = normalized.replace(",", ".")
        elif normalized.count(".") > 1:
            normalized = normalized.replace(".", "")

        try:
            value = float(normalized)
        except ValueError:
            continue
        if value >= 100:
            values.append(value)

    return max(values) if values else None


def _extract_budget_from_answers(user_answers: dict[str, Any]) -> float | None:
    for value in user_answers.values():
        if isinstance(value, str):
            parsed = _parse_money_value(value)
            if parsed:
                return parsed
    return None


def _continuous_budget_score(
    *,
    product_price: float,
    monthly_budget: float,
    user_answers: dict[str, Any],
    budget_guard: dict[str, Any],
    financial_risk: str,
) -> int:
    budget_from_answers = _extract_budget_from_answers(user_answers)
    effective_budget = budget_from_answers or monthly_budget or float(budget_guard.get("monthly_budget") or 0.0)

    if product_price > 0 and effective_budget > 0:
        return _score_from_monthly_budget(product_price, effective_budget)

    budget_utilization = float(budget_guard.get("budget_utilization") or 0.0)
    if budget_utilization > 0:
        return _score_from_ratio(budget_utilization)

    price_vs_average = float(budget_guard.get("price_vs_average") or 0.0)
    if price_vs_average > 0:
        return _score_from_ratio(price_vs_average * 0.45)

    fallback_by_risk: dict[str, int] = {"low": 82, "medium": 48, "high": 18, "unknown": 45}
    return fallback_by_risk.get(financial_risk, 50)


def _expand_total_score(score: float) -> float:
    """Widens the useful final-score range while keeping a safe 20-95 clamp."""
    return max(20.0, min(95.0, 50.0 + (score - 50.0) * 1.25))


def _thresholds_for_mode(mode: str) -> tuple[int, int, int]:
    if mode == "soft":
        return 70, 50, 30
    if mode == "strict":
        return 80, 65, 45
    return 75, 55, 32


def _build_result(
    verdict: str,
    confidence_score: int,
    primary_reason: str,
    suggested_action: str,
    score_breakdown: dict[str, int],
    flags: list[str],
    traces: list[Any],
    duration_ms: int,
    # trace fields
    total_score: float = 0.0,
    weakest: str = "-",
    product_score: int = 0,
    need_score: int = 0,
    budget_score: int = 0,
    behavior_score: int = 0,
) -> dict:
    traces.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": "verdict",
            "status": "completed",
            "duration_ms": duration_ms,
            "input_summary": (f"4 agent skoru birleştirildi: ürün={product_score}, ihtiyaç={need_score}, bütçe={budget_score}, davranış={int(behavior_score)}"),
            "output_summary": f"Karar: {verdict}, güven: {confidence_score}/100",
            "key_findings": [
                f"Toplam skor: {total_score:.1f}/100",
                f"En zayıf boyut: {weakest}",
                f"Aktif uyarılar: {', '.join(flags) if flags else 'yok'}",
            ],
            "triggered_actions": [],
        }
    )

    return {
        "verdict_output": {
            "verdict": verdict,
            "confidence_score": confidence_score,
            "score_breakdown": score_breakdown,
            "primary_reason": primary_reason,
            "flags": flags,
            "suggested_action": suggested_action,
        },
        "agent_traces": traces,
    }


# ---------------------------------------------------------------------------
# Ana ajan fonksiyonu
# ---------------------------------------------------------------------------


async def run(state: AgentState) -> dict:
    started = time.monotonic()

    mode: str = state.get("mode") or "balanced"
    behavior_profile: dict[str, Any] = state.get("behavior_profile_output") or {}
    review_risk: dict[str, Any] = state.get("review_risk_output") or {}
    need_analyzer: dict[str, Any] = state.get("need_analyzer_output") or {}
    budget_guard: dict[str, Any] = state.get("budget_guard_output") or {}
    user_answers: dict[str, Any] = state.get("user_answers") or {}
    traces: list[Any] = list(state.get("agent_traces") or [])

    # ------------------------------------------------------------------
    # Hard Block 1: Bütçe guard hard stop
    # ------------------------------------------------------------------
    if budget_guard.get("blocks_purchase", False):
        duration_ms = int((time.monotonic() - started) * 1000)
        return _build_result(
            verdict="dont_buy",
            confidence_score=95,
            primary_reason="Bütçe aşımı tespit edildi; disiplinli mod satın almayı engelliyor.",
            suggested_action="Aylık bütçenizi gözden geçirin veya daha uygun fiyatlı alternatifler arayın.",
            score_breakdown=_zero_scores(),
            flags=["budget_blocked"],
            traces=traces,
            duration_ms=duration_ms,
        )

    # ------------------------------------------------------------------
    # Adım 2: Bireysel skorlar
    # ------------------------------------------------------------------

    # product_score: riski ters çevir
    risk_score: int = int(review_risk.get("risk_score") or 50)
    review_confidence: int = int(review_risk.get("confidence") or 0)
    product_score: int = 100 - risk_score

    # need_score
    _raw_need = need_analyzer.get("need_score")
    raw_need: int = -1 if _raw_need is None else int(_raw_need)
    need_score: int = 50 if raw_need == -1 else raw_need

    # budget_score
    financial_risk: str = budget_guard.get("financial_risk") or "unknown"
    product_price = float(state.get("product_price") or budget_guard.get("product_price") or 0.0)
    monthly_budget = float(state.get("monthly_budget") or budget_guard.get("monthly_budget") or 0.0)
    budget_score: int = _continuous_budget_score(
        product_price=product_price,
        monthly_budget=monthly_budget,
        user_answers=user_answers,
        budget_guard=budget_guard,
        financial_risk=financial_risk,
    )

    # behavior_score
    impulsivity_score: int = int(behavior_profile.get("impulsivity_score") or 50)
    threshold_adjustment: float = float(behavior_profile.get("threshold_adjustment") or 0.0)
    behavior_score: int = max(0, min(100, int((100 - impulsivity_score) + threshold_adjustment)))

    # ------------------------------------------------------------------
    # Adım 3: Ağırlıklı toplam skor
    # ------------------------------------------------------------------
    weights: dict[str, dict[str, float]] = {
        "soft": {"product": 0.15, "need": 0.40, "budget": 0.35, "behavior": 0.10},
        "balanced": {"product": 0.25, "need": 0.25, "budget": 0.25, "behavior": 0.25},
        "strict": {"product": 0.40, "need": 0.15, "budget": 0.15, "behavior": 0.30},
    }
    w = weights.get(mode, weights["balanced"])

    raw_total_score: float = product_score * w["product"] + need_score * w["need"] + budget_score * w["budget"] + behavior_score * w["behavior"]
    total_score: float = _expand_total_score(raw_total_score)

    # ------------------------------------------------------------------
    # Adım 4: Karar eşikleri ve kritik skor guard'ları
    # ------------------------------------------------------------------
    buy_threshold, conditional_threshold, wait_threshold = _thresholds_for_mode(mode)

    if product_score < 35:
        verdict = "consider_alternative"
    elif financial_risk == "high" and mode in ("balanced", "strict"):
        verdict = "dont_buy" if mode == "strict" else "wait"
    elif mode == "strict" and need_score < 35:
        verdict = "dont_buy"
    elif need_score < 25:
        verdict = "dont_buy"
    elif mode == "strict" and total_score < buy_threshold and (need_score < 50 or budget_score < 35):
        verdict = "wait"
    elif need_score < 40 and total_score >= conditional_threshold:
        verdict = "wait"
    elif review_confidence > 0 and product_score < 45:
        verdict = "wait"
    elif total_score >= buy_threshold and need_score >= 45 and budget_score >= 35:
        verdict = "buy"
    elif total_score >= conditional_threshold:
        verdict = "conditional_buy"
    elif total_score >= wait_threshold:
        verdict = "wait"
    else:
        verdict = "dont_buy"

    # ------------------------------------------------------------------
    # Adım 5: Güven skoru
    # ------------------------------------------------------------------
    confidence_score = _clamp_score(total_score, 20, 95)

    # ------------------------------------------------------------------
    # Adım 6: Uyarı flagleri
    # ------------------------------------------------------------------
    flags: list[str] = []

    if review_risk.get("triggers_need_recheck"):
        flags.append("high_review_risk")
    if impulsivity_score >= 70:
        flags.append("impulsive_buyer")
    if financial_risk == "high":
        flags.append("budget_strain")
    if behavior_profile.get("similar_past_purchase"):
        flags.append("owns_similar_product")
    if need_score < 30:
        flags.append("low_need_score")
    if product_score < 40:
        flags.append("low_product_fit")

    # ------------------------------------------------------------------
    # Adım 7: Birincil neden ve önerilen eylem
    # ------------------------------------------------------------------
    scores_map: dict[str, int] = {
        "product": product_score,
        "need": need_score,
        "budget": budget_score,
        "behavior": behavior_score,
    }

    # Exclude product from "weakest" selection if no review data
    if review_confidence == 0:
        scores_map.pop("product", None)

    if scores_map:
        weakest: str = min(scores_map, key=lambda k: scores_map[k])
    else:
        weakest: str = "need"  # safe default

    reason_map: dict[str, str] = {
        "product": "Ürün yorumlarında önemli risk faktörleri tespit edildi.",
        "need": "Bu ürüne duyulan ihtiyaç yeterince güçlü görünmüyor.",
        "budget": "Finansal risk seviyesi bu satın alma için yüksek.",
        "behavior": "Kullanıcının alışveriş alışkanlıkları bu satın almayı desteklemiyor.",
    }
    primary_reason: str = reason_map[weakest]

    if verdict == "consider_alternative":
        primary_reason = "Bu ürün mevcut sinyallere göre ihtiyaca yeterince uygun görünmüyor."
    elif verdict == "dont_buy" and need_score < 25:
        primary_reason = "Gerçek ihtiyaç sinyali çok zayıf; satın alma dürtüsel olabilir."
    elif verdict == "wait" and need_score < 40:
        primary_reason = "İhtiyaç netleşmeden satın alma kararını ertelemek daha güvenli."

    action_map: dict[str, str] = {
        "buy": "Satın alma kararınız sağlıklı görünüyor, devam edebilirsiniz.",
        "conditional_buy": "Satın almadan önce bu ürünün risklerini ve kullanım ihtiyacınızı son kez kontrol edin.",
        "wait": "Bu satın almayı en az 24 saat ertelemenizi öneririz.",
        "dont_buy": "Bu satın almadan şimdilik kaçınmanızı öneririz.",
        "consider_alternative": "Bu ürünü şimdi almak yerine ihtiyacınızı yeniden netleştirin.",
    }
    suggested_action: str = action_map[verdict]

    # ------------------------------------------------------------------
    # Çıktı
    # ------------------------------------------------------------------
    score_breakdown: dict[str, int] = {
        "product_score": product_score,
        "need_score": need_score,
        "budget_score": budget_score,
        "behavior_score": behavior_score,
    }

    duration_ms = int((time.monotonic() - started) * 1000)
    return _build_result(
        verdict=verdict,
        confidence_score=confidence_score,
        primary_reason=primary_reason,
        suggested_action=suggested_action,
        score_breakdown=score_breakdown,
        flags=flags,
        traces=traces,
        duration_ms=duration_ms,
        total_score=total_score,
        weakest=weakest,
        product_score=product_score,
        need_score=need_score,
        budget_score=budget_score,
        behavior_score=behavior_score,
    )
