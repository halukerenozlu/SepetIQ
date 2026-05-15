"""
Tone Writer Agent
-----------------
Pipeline'ın son ajanı. Verdict + tüm bağlamı alır,
kullanıcıya gösterilecek Türkçe mesajı Gemini ile üretir.
Ton: verdict + kullanıcı modu + davranış profili etiketine göre belirlenir.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from dotenv import find_dotenv, load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from models.state import AgentState

load_dotenv(find_dotenv(usecwd=False))

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured output şeması — Gemini'den alınan kısım
# ---------------------------------------------------------------------------


class ToneWriterMessage(BaseModel):
    headline: str = Field(description="Max 10 kelime, Türkçe, özlü başlık")
    body: str = Field(description="2-3 cümle, Türkçe, empatik açıklama")
    suggested_action: str = Field(description="1 eyleme dönük cümle, Türkçe")


# ---------------------------------------------------------------------------
# Lazy init
# ---------------------------------------------------------------------------

_structured = None


def _get_structured():
    global _structured
    if _structured is None:
        _structured = ChatGoogleGenerativeAI(model="gemini-2.0-flash").with_structured_output(ToneWriterMessage)
    return _structured


# ---------------------------------------------------------------------------
# Ton seçimi
# ---------------------------------------------------------------------------

_DISPLAY_MAP = {
    "buy": "Al",
    "conditional_buy": "Koşullu Al",
    "wait": "Bekle",
    "dont_buy": "Alma",
}

_TONE_GUIDELINES = {
    "encouraging": "sıcak, destekleyici; kararı onayla ama abartma",
    "cautious": "nazik uyarı, empatik; vaaz verme",
    "firm": "doğrudan, net sınırlar, koruyucu; sert değil",
    "neutral": "olgusal, dengeli; güçlü duygu yok",
}


def _select_tone(verdict: str, profile_tag: str) -> str:
    if verdict == "buy":
        return "encouraging"
    if verdict == "conditional_buy":
        return "cautious"
    if verdict == "wait":
        return "firm" if profile_tag == "impulsive" else "cautious"
    # dont_buy
    return "firm"


# ---------------------------------------------------------------------------
# Prompt sabitleri
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "Sen SepetIQ'sun — Türk kullanıcıların daha akıllı alışveriş kararları "
    "vermesine yardımcı olan bir alışveriş asistanısın. "
    "Tonun: {tone}. Ton rehberi: {tone_guideline}.\n"
    "Her zaman Türkçe yaz. Asla İngilizce kelime kullanma. "
    "SADECE geçerli JSON döndür. Markdown veya açıklama ekleme."
)

_USER_PROMPT = (
    "Ürün: {product_name} ({category}), {price} TL\n"
    "Satın alma kararı: {display_verdict} (güven: {confidence_score}/100)\n"
    "Ana neden: {primary_reason}\n"
    "Kullanıcı profili: {profile_tag}, dürtüsellik: {impulsivity_score}/100\n"
    "Mod: {mode}\n"
    "Aktif uyarılar: {flags_str}\n"
    "Önerilen eylem: {suggested_action}\n\n"
    "Bu kullanıcı için kişiselleştirilmiş bir mesaj yaz. "
    "Tam olarak bu JSON'ı döndür:\n"
    "{{\n"
    '  "headline": "<max 10 kelime, Türkçe, çarpıcı>",\n'
    '  "body": "<2-3 cümle, Türkçe, empatik; ürün adını en az bir kez kullan>",\n'
    '  "suggested_action": "<Türkçe 1 eyleme dönük cümle>"\n'
    "}}\n\n"
    "Kurallar:\n"
    "- headline kararı açıkça yansıtmalı\n"
    "- body ürün adını en az bir kez içermeli\n"
    "- 'firm' tonda: koruyucu ol ama yargılama\n"
    "- 'encouraging' tonda: kararı onayla ama abartma\n"
    "- Mesajda skor veya sayı kullanma\n"
    "- 'yapay zeka' veya 'algoritma' kelimelerini kullanma"
)


# ---------------------------------------------------------------------------
# Ana ajan fonksiyonu
# ---------------------------------------------------------------------------


async def run(state: AgentState) -> dict:
    started = time.monotonic()

    verdict_output: dict = state.get("verdict_output") or {}
    product_context: dict = state.get("product_context_output") or {}
    behavior_profile: dict = state.get("behavior_profile_output") or {}
    mode: str = state.get("mode") or "balanced"
    traces = list(state.get("agent_traces") or [])

    verdict: str = verdict_output.get("verdict") or "wait"
    confidence_score: int = int(verdict_output.get("confidence_score") or 50)
    primary_reason: str = verdict_output.get("primary_reason") or ""
    flags: list[str] = verdict_output.get("flags") or []
    suggested_action_raw: str = verdict_output.get("suggested_action") or "Daha fazla bilgi için ürünü karşılaştırın."

    product_name: str = product_context.get("structured_name") or state.get("product_name") or "Ürün"
    category: str = product_context.get("category_normalized") or state.get("product_category") or ""
    price: float = float(state.get("product_price") or 0.0)

    profile_tag: str = behavior_profile.get("profile_tag") or "unknown"
    impulsivity_score: int = int(behavior_profile.get("impulsivity_score") or 50)

    tone = _select_tone(verdict, profile_tag)
    display_verdict = _DISPLAY_MAP.get(verdict, "Bekle")
    flags_str = ", ".join(flags) if flags else "yok"

    # ------------------------------------------------------------------
    # Gemini çağrısı
    # ------------------------------------------------------------------
    result: ToneWriterMessage | None = None
    try:
        system_msg = _SYSTEM_PROMPT.format(
            tone=tone,
            tone_guideline=_TONE_GUIDELINES[tone],
        )
        user_msg = _USER_PROMPT.format(
            product_name=product_name,
            category=category,
            price=price,
            display_verdict=display_verdict,
            confidence_score=confidence_score,
            primary_reason=primary_reason,
            profile_tag=profile_tag,
            impulsivity_score=impulsivity_score,
            mode=mode,
            flags_str=flags_str,
            suggested_action=suggested_action_raw,
        )
        result = await _get_structured().ainvoke(
            [
                ("system", system_msg),
                ("human", user_msg),
            ]
        )
    except Exception as e:
        logger.warning("Tone writer Gemini failed: %s", e)

    # ------------------------------------------------------------------
    # Fallback — Gemini başarısız olursa
    # ------------------------------------------------------------------
    if result is None:
        fallback_headlines = {
            "buy": "Bu alışveriş sağlıklı görünüyor.",
            "conditional_buy": "Almadan önce bir düşün.",
            "wait": "Biraz beklemeni öneririz.",
            "dont_buy": "Bu alışverişten şimdilik uzak dur.",
        }
        fallback_bodies = {
            "buy": (f"{product_name} için veriler olumlu. Güvenle devam edebilirsin."),
            "conditional_buy": (f"{product_name} için bazı çekinceler var. Alternatifleri de değerlendirmeni öneririz."),
            "wait": (f"{product_name} için koşullar henüz tam uygun değil. 24 saat sonra tekrar değerlendir."),
            "dont_buy": (f"{product_name} için finansal veya ihtiyaç bazlı önemli riskler tespit edildi."),
        }
        headline = fallback_headlines.get(verdict, "Karar değerlendiriliyor.")
        body = fallback_bodies.get(verdict, "Alışveriş verileriniz analiz edildi.")
        suggested_action_out = suggested_action_raw
    else:
        headline = result.headline
        body = result.body
        suggested_action_out = result.suggested_action

    # ------------------------------------------------------------------
    # Çıktı
    # ------------------------------------------------------------------
    tone_writer_output = {
        "headline": headline,
        "body": body,
        "suggested_action": suggested_action_out,
        "tone_used": tone,
        "display_verdict": display_verdict,
    }

    duration_ms = int((time.monotonic() - started) * 1000)
    traces.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": "tone_writer",
            "status": "completed",
            "duration_ms": duration_ms,
            "input_summary": f"Karar: {display_verdict}, ton: {tone}, mod: {mode}",
            "output_summary": f"Başlık üretildi: {headline[:40]}...",
            "key_findings": [
                f"Kullanılan ton: {tone}",
                f"Görünen karar: {display_verdict}",
                f"Profil etkisi: {profile_tag}",
            ],
            "triggered_actions": [],
        }
    )

    return {
        "tone_writer_output": tone_writer_output,
        "agent_traces": traces,
    }
