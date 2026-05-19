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
        return -5
    if mode == "strict":
        return 8
    return 0


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
    budget_score_map: dict[str, int] = {"low": 90, "medium": 55, "high": 20, "unknown": 50}
    budget_score: int = budget_score_map.get(financial_risk, 50)

    # behavior_score
    impulsivity_score: int = int(behavior_profile.get("impulsivity_score") or 50)
    threshold_adjustment: float = float(behavior_profile.get("threshold_adjustment") or 0.0)
    behavior_score: int = max(0, min(100, int((100 - impulsivity_score) + threshold_adjustment)))

    # ------------------------------------------------------------------
    # Adım 3: Ağırlıklı toplam skor
    # ------------------------------------------------------------------
    weights: dict[str, dict[str, float]] = {
        "soft": {"product": 0.30, "need": 0.20, "budget": 0.25, "behavior": 0.25},
        "balanced": {"product": 0.25, "need": 0.30, "budget": 0.25, "behavior": 0.20},
        "strict": {"product": 0.20, "need": 0.35, "budget": 0.25, "behavior": 0.20},
    }
    w = weights.get(mode, weights["balanced"])

    total_score: float = product_score * w["product"] + need_score * w["need"] + budget_score * w["budget"] + behavior_score * w["behavior"]

    # ------------------------------------------------------------------
    # Adım 4: Karar eşikleri ve kritik skor guard'ları
    # ------------------------------------------------------------------
    offset = _mode_offset(mode)
    buy_threshold = 72 + offset
    conditional_threshold = 52 + offset
    wait_threshold = 32 + offset

    if product_score < 35:
        verdict = "consider_alternative"
    elif financial_risk == "high" and mode in ("balanced", "strict"):
        verdict = "dont_buy" if mode == "strict" else "wait"
    elif need_score < 25:
        verdict = "dont_buy"
    elif need_score < 40 and total_score >= conditional_threshold:
        verdict = "wait"
    elif review_confidence > 0 and product_score < 45:
        verdict = "wait"
    elif total_score >= buy_threshold and need_score >= 60 and budget_score >= 50:
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
    confidence_score = 50

    if review_confidence >= 80:
        confidence_score += 20
    elif review_confidence >= 60:
        confidence_score += 10

    if raw_need != -1:  # gerçekten skorlandı
        confidence_score += 15

    if financial_risk != "unknown":
        confidence_score += 10

    if behavior_profile.get("profile_tag") not in (None, "unknown"):
        confidence_score += 5

    confidence_score = min(100, confidence_score)

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
