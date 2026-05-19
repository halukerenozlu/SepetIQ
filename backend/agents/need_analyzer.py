"""
Need Analyzer Agent
-------------------
İki aşamalı çalışır:
  1. İlk çalışma (cycle_iteration == 0): Gemini ile 3 Türkçe soru üretir.
  2. İkinci çalışma (cycle_iteration >= 1, user_answers dolu): Saf Python ile ihtiyaç skoru hesaplar.
"""

from __future__ import annotations
import os

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
# Pydantic şeması — Gemini structured output için (yalnızca ilk çalışmada)
# ---------------------------------------------------------------------------


class Question(BaseModel):
    id: str = Field(description="Question identifier: q1, q2, or q3")
    text: str = Field(description="Question text in Turkish")
    type: Literal["multiple_choice", "yes_no"] = Field(description="Question type")
    options: list[str] = Field(description="Answer options in Turkish")


class QuestionsOutput(BaseModel):
    questions: list[Question] = Field(description="Exactly 3 questions")


# ---------------------------------------------------------------------------
# Prompt şablonları
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are a need-assessment assistant for a shopping AI. "
    "Generate exactly 3 questions in Turkish to assess whether the user truly needs this product. "
    "Questions should be specific to the product category, price, and user profile. "
    "Uncover: actual use case, frequency of use, whether they already own something similar, and purchase trigger. "
    "Keep every option short enough for a compact browser extension UI. "
    "Respond ONLY with valid JSON. No markdown, no explanation."
)

_USER_PROMPT_TEMPLATE = """\
Product: {product_name} ({category}), Price: {price} TL
User behavior profile: {profile_tag}, impulsivity score: {impulsivity_score}/100
Mode: {mode}

Generate 3 questions. Return this exact JSON:
{{
  "questions": [
    {{
      "id": "q1",
      "text": "<question in Turkish>",
      "type": "multiple_choice",
      "options": ["<option1>", "<option2>", "<option3>"]
    }},
    {{
      "id": "q2",
      "text": "<question in Turkish>",
      "type": "yes_no",
      "options": ["Evet", "Hayır"]
    }},
    {{
      "id": "q3",
      "text": "<question in Turkish>",
      "type": "multiple_choice",
      "options": ["<option1>", "<option2>", "<option3>", "<option4>"]
    }}
  ]
}}

Rules:
- q1: ask about product-specific use frequency or main use case
- q2: ask whether they already own something similar that still works (yes_no)
- q3: ask about urgency or purchase trigger
- For "impulsive" profile, make questions more probing
- For "strict" mode, add a question about budget planning
- Options should be at most 45 characters
- Avoid generic wording like "Bu ürün"; mention the product type when possible
- All text must be in Turkish\
"""

# ---------------------------------------------------------------------------
# Sabit fallback soruları
# ---------------------------------------------------------------------------

_FALLBACK_QUESTIONS: list[dict[str, Any]] = [
    {
        "id": "q1",
        "text": "Bu ürünü ne sıklıkla kullanmayı planlıyorsunuz?",
        "type": "multiple_choice",
        "options": ["Her gün", "Haftada birkaç kez", "Ayda birkaç kez", "Nadiren"],
    },
    {
        "id": "q2",
        "text": "Benzer bir ürününüz var mı?",
        "type": "yes_no",
        "options": ["Evet", "Hayır"],
    },
    {
        "id": "q3",
        "text": "Bu ürüne ne zaman ihtiyacınız var?",
        "type": "multiple_choice",
        "options": ["Hemen", "Bu hafta", "Bu ay", "Emin değilim"],
    },
]

_FIRST_RUN_FALLBACK: dict[str, Any] = {
    "questions": _FALLBACK_QUESTIONS,
    "need_score": -1,
    "need_level": "pending",
    "scoring_rationale": "",
    "awaiting_answers": True,
}

# ---------------------------------------------------------------------------
# Lazy-initialized structured chain
# ---------------------------------------------------------------------------

_structured_chain = None


def _get_chain():
    global _structured_chain
    if _structured_chain is None:
        llm = ChatGoogleGenerativeAI(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
        _structured_chain = llm.with_structured_output(QuestionsOutput)
    return _structured_chain


def _short_product_type(product_name: str, category: str) -> str:
    """Returns a compact product type for Turkish question text."""
    text = f"{product_name} {category}".lower()
    if any(word in text for word in ("tıraş", "traş", "oneblade", "sakal")):
        return "bu tıraş makinesi"
    if any(word in text for word in ("kahve", "espresso", "öğüt")):
        return "bu kahve ürünü"
    if any(word in text for word in ("saat", "watch", "bileklik")):
        return "bu akıllı saat"
    if any(word in text for word in ("kulaklık", "headphone", "earbuds")):
        return "bu kulaklık"
    if any(word in text for word in ("telefon", "phone", "iphone", "galaxy")):
        return "bu telefon"
    if any(word in text for word in ("laptop", "notebook", "bilgisayar")):
        return "bu bilgisayar"
    if any(word in text for word in ("parfüm", "krem", "serum", "kozmetik")):
        return "bu bakım ürünü"
    return "bu ürünü"


def _build_fallback_questions(
    product_name: str,
    category: str,
    mode: str,
    behavior_profile: dict[str, Any],
) -> list[dict[str, Any]]:
    product_type = _short_product_type(product_name, category)
    profile_tag = str(behavior_profile.get("profile_tag") or "unknown")
    q3_text = f"{product_type.capitalize()} için satın alma sebebin ne?"
    q3_options = [
        "Net bir ihtiyacım var",
        "İndirim baskısı var",
        "Merak ettim, emin değilim",
    ]

    if mode == "strict":
        q3_text = f"{product_type.capitalize()} bütçende planlı mı?"
        q3_options = ["Evet, planladım", "Hayır, ani karar", "Emin değilim"]
    elif profile_tag == "impulsive":
        q3_text = f"{product_type.capitalize()} isteği nereden geldi?"
        q3_options = ["Gerçek ihtiyaç", "İndirim/reklam", "Anlık heves"]

    return [
        {
            "id": "q1",
            "text": f"{product_type.capitalize()} hangi sıklıkla kullanacaksın?",
            "type": "multiple_choice",
            "options": ["Her gün/haftalık", "Ayda birkaç kez", "Nadiren"],
        },
        {
            "id": "q2",
            "text": "Aynı işi gören çalışan bir ürünün var mı?",
            "type": "yes_no",
            "options": ["Evet", "Hayır"],
        },
        {
            "id": "q3",
            "text": q3_text,
            "type": "multiple_choice",
            "options": q3_options,
        },
    ]


def _questions_are_demo_ready(questions: list[dict[str, Any]]) -> bool:
    if len(questions) != 3:
        return False

    for question in questions:
        text = str(question.get("text") or "")
        options = question.get("options") or []
        if len(text) < 12 or len(text) > 150:
            return False
        if question.get("type") == "yes_no":
            if options != ["Evet", "Hayır"]:
                question["options"] = ["Evet", "Hayır"]
            continue
        if not isinstance(options, list) or not 2 <= len(options) <= 4:
            return False
        if any(len(str(option)) > 56 for option in options):
            return False

    return True


# ---------------------------------------------------------------------------
# İkinci çalışma: saf Python skorlama
# ---------------------------------------------------------------------------

def _contains_any(text: str, tokens: tuple[str, ...]) -> bool:
    return any(token in text for token in tokens)


def _answer_quality_score(answers: tuple[str, ...]) -> tuple[int, str | None]:
    filled_answers = [answer.strip() for answer in answers if answer.strip()]
    if not filled_answers:
        return -20, "cevap bilgisi yetersiz"

    combined = " ".join(filled_answers)
    word_count = len(combined.split())
    vague_tokens = ("bilmiyorum", "emin değil", "emin degil", "belki", "kararsız", "kararsiz", "fikrim yok")
    short_yes_no_count = sum(answer in ("evet", "hayır", "hayir", "yok") for answer in filled_answers)

    if word_count <= 3 or short_yes_no_count >= 2 or _contains_any(combined, vague_tokens):
        return -15, "cevaplar kısa veya belirsiz"

    if word_count >= 12:
        return 8, "cevaplar yeterince açıklayıcı"

    return 0, None


def _need_intent_score(text: str) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []

    strong_need_tokens = (
        "iş için",
        "is icin",
        "işte",
        "iste",
        "okul için",
        "okul icin",
        "proje",
        "müşteri",
        "musteri",
        "lazım",
        "lazim",
        "gerekiyor",
        "ihtiyacım var",
        "ihtiyacim var",
        "zorundayım",
        "zorundayim",
        "eski bozuldu",
        "bozuldu",
        "bozuk",
        "kırıldı",
        "kirildi",
        "çalışmıyor",
        "calismiyor",
        "yerine alacağım",
        "yerine alacagim",
    )
    moderate_need_tokens = ("her gün", "her gun", "günlük", "gunluk", "düzenli", "duzenli", "haftalık", "haftalik", "planladım", "planladim")
    impulse_tokens = (
        "çok istiyorum",
        "cok istiyorum",
        "güzel görünüyor",
        "guzel gorunuyor",
        "hoşuma gitti",
        "hosuma gitti",
        "beğendim",
        "begendim",
        "heves",
        "trend",
        "reklam",
        "sosyal medya",
        "indirim",
        "fırsat",
        "firsat",
        "kaçırmak istemiyorum",
        "kacirmak istemiyorum",
    )

    if _contains_any(text, strong_need_tokens):
        score += 28
        reasons.append("net ihtiyaç kanıtı var")
    elif _contains_any(text, moderate_need_tokens):
        score += 14
        reasons.append("düzenli kullanım niyeti var")

    if _contains_any(text, impulse_tokens):
        score -= 28
        reasons.append("duygusal veya dürtüsel satın alma sinyali var")

    return score, reasons


def _score_need(
    user_answers: dict[str, Any],
    behavior_profile: dict[str, Any],
    budget_guard: dict[str, Any],
    mode: str,
) -> tuple[int, str, str]:
    """(need_score, need_level, scoring_rationale) döndürür."""
    score = 50
    rationale_parts: list[str] = []

    q1 = str(user_answers.get("q1") or "").lower()
    q2 = str(user_answers.get("q2") or "").lower()
    q3 = str(user_answers.get("q3") or "").lower()
    combined_answers = " ".join((q1, q2, q3))

    quality_delta, quality_reason = _answer_quality_score((q1, q2, q3))
    score += quality_delta
    if quality_reason:
        rationale_parts.append(quality_reason)

    intent_delta, intent_reasons = _need_intent_score(combined_answers)
    score += intent_delta
    rationale_parts.extend(intent_reasons)
    has_clear_need_signal = intent_delta >= 28
    has_impulse_signal = intent_delta < 0 or _contains_any(
        combined_answers,
        ("istiyorum", "görünüyor", "gorunuyor", "çok istiyorum", "cok istiyorum", "güzel", "guzel", "hoşuma", "hosuma", "beğendim", "begendim", "heves"),
    )
    has_vague_signal = quality_delta < 0
    has_need_evidence = intent_delta > 0 or _contains_any(
        combined_answers,
        ("net", "planlad", "ihtiyaç", "ihtiyac", "iş", "is", "gerekiyor", "lazım", "lazim"),
    )

    # q1: kullanım sıklığı / ana amaç
    if any(token in q1 for token in ("her gün", "haftalık", "günlük", "sık", "düzenli")):
        score += 16
        rationale_parts.append("düzenli kullanım sinyali var")
    elif any(token in q1 for token in ("ayda", "bazen", "ara sıra")):
        score += 4
    elif any(token in q1 for token in ("nadiren", "özel durum", "emin değil")):
        score -= 14
        rationale_parts.append("kullanım sıklığı düşük görünüyor")

    # q2: benzer ürüne zaten sahip → ihtiyacı düşür
    if "evet" in q2:
        score -= 24
        rationale_parts.append("aynı işi gören ürün zaten var")
    elif "hayır" in q2:
        score += 14
        rationale_parts.append("mevcut alternatif yok")

    # q3: aciliyet sinyalleri
    if any(token in q3 for token in ("net", "planlad", "ihtiyaç", "iş", "gerekiyor")):
        score += 10
        rationale_parts.append("satın alma gerekçesi net")
    elif any(token in q3 for token in ("hemen", "bugün")):
        score += 2
    if any(token in q3 for token in ("indirim", "reklam", "sosyal", "ani", "heves")):
        score -= 24
        rationale_parts.append("tetikleyici alışveriş sinyali var")
    elif any(token in q3 for token in ("emin değil", "belki", "merak")):
        score -= 16
        rationale_parts.append("satın alma motivasyonu net değil")

    # Geçmiş ve bütçe sinyalleri
    if behavior_profile.get("similar_past_purchase"):
        score -= 18
        rationale_parts.append("yakın geçmişte benzer alışveriş var")

    financial_risk = str(budget_guard.get("financial_risk") or "unknown")
    has_budget_info = financial_risk != "unknown" or float(budget_guard.get("monthly_budget") or 0.0) > 0 or float(budget_guard.get("budget_utilization") or 0.0) > 0
    if financial_risk == "high":
        score -= 12
        rationale_parts.append("bütçe riski yüksek")
    elif financial_risk == "low":
        score += 5
    elif not has_budget_info:
        score -= 5
        rationale_parts.append("bütçe bilgisi yetersiz")

    # Davranış profili modifiye
    impulsivity_score = int(behavior_profile.get("impulsivity_score") or 50)
    if impulsivity_score >= 70:
        score -= 15  # dürtüsel alıcı → aciliyete güvenme
        rationale_parts.append("dürtüsel alışveriş eğilimi tespit edildi")
    elif impulsivity_score <= 30:
        score += 10  # bilinçli alıcı → ihtiyacına güven

    # Mod modifiye
    if mode == "strict":
        if has_need_evidence:
            score -= 4
        else:
            score -= 10
            rationale_parts.append("sıkı modda ihtiyaç kanıtı yetersiz")
        rationale_parts.append("sıkı mod daha temkinli değerlendiriyor")
    elif mode == "soft":
        score += 10
        rationale_parts.append("nazik mod ihtiyaç ifadesine daha toleranslı")

    if has_clear_need_signal:
        score = min(90, max(70, score))
    elif has_impulse_signal:
        score = max(25, min(40, score))
    elif has_vague_signal:
        score = max(30, min(45, score))

    need_score = max(0, min(100, score))

    # need_level
    if need_score >= 70:
        need_level = "high"
    elif need_score >= 40:
        need_level = "medium"
    else:
        need_level = "low"

    if rationale_parts:
        scoring_rationale = "İhtiyaç skoru şu sinyallere göre hesaplandı: " + ", ".join(rationale_parts[:4]) + "."
    else:
        scoring_rationale = f"İhtiyaç skoru {need_score}/100 olarak hesaplandı."

    return need_score, need_level, scoring_rationale


# ---------------------------------------------------------------------------
# Ana ajan fonksiyonu
# ---------------------------------------------------------------------------


async def run(state: AgentState) -> dict:
    started = time.monotonic()

    cycle_iteration: int = state.get("cycle_iteration") or 0
    user_answers: dict[str, Any] = state.get("user_answers") or {}
    mode: str = state.get("mode") or "balanced"
    product_name: str = state.get("product_name") or "Bilinmeyen Ürün"
    category: str = state.get("product_category") or "electronics"
    price: float = state.get("product_price") or 0.0
    behavior_profile: dict[str, Any] = state.get("behavior_profile_output") or {}
    budget_guard: dict[str, Any] = state.get("budget_guard_output") or {}

    profile_tag: str = behavior_profile.get("profile_tag") or "unknown"
    impulsivity_score: int = int(behavior_profile.get("impulsivity_score") or 50)

    # Sadece user_answers'a bak: cevap varsa ikinci çalışma, yoksa birinci.
    # cycle_iteration'a bağlı olmak kırılgan — state injection gecikmesi bug'a neden oluyordu.
    is_first_run = not bool(user_answers)

    # -----------------------------------------------------------------------
    # İLK ÇALIŞMA: Gemini ile soru üret
    # -----------------------------------------------------------------------
    if is_first_run:
        questions: list[dict[str, Any]] = []
        gemini_ok = False

        from utils.gemini_client import invoke_with_retry

        user_prompt = _USER_PROMPT_TEMPLATE.format(
            product_name=product_name,
            category=category,
            price=price,
            profile_tag=profile_tag,
            impulsivity_score=impulsivity_score,
            mode=mode,
        )
        messages = [
            ("system", _SYSTEM_PROMPT),
            ("human", user_prompt),
        ]
        extracted: QuestionsOutput | None = await invoke_with_retry(
            _get_chain(),
            messages,
            fallback=None,
            agent_name="need_analyzer",
        )
        if extracted is not None:
            questions = [q.model_dump() for q in (extracted.questions or [])]
            if _questions_are_demo_ready(questions):
                gemini_ok = True

        if not gemini_ok:
            questions = _build_fallback_questions(product_name, category, mode, behavior_profile)

        result: dict[str, Any] = {
            "questions": questions,
            "need_score": -1,
            "need_level": "pending",
            "scoring_rationale": "",
            "awaiting_answers": True,
        }

        duration_ms = int((time.monotonic() - started) * 1000)
        traces = list(state.get("agent_traces") or [])
        traces.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent": "need_analyzer",
                "status": "completed",
                "duration_ms": duration_ms,
                "input_summary": f"Döngü {cycle_iteration}, cevap sayısı: {len(user_answers)}",
                "output_summary": "Sorular üretildi, cevap bekleniyor",
                "key_findings": [q["text"][:50] for q in questions],
                "triggered_actions": [],
            }
        )

        return {"need_analyzer_output": result, "agent_traces": traces}

    # -----------------------------------------------------------------------
    # İKİNCİ ÇALIŞMA: Saf Python ile skorla — Gemini çağrısı yok
    # -----------------------------------------------------------------------
    existing_output: dict[str, Any] = state.get("need_analyzer_output") or {}
    questions = existing_output.get("questions") or list(_FALLBACK_QUESTIONS)

    need_score, need_level, scoring_rationale = _score_need(
        user_answers,
        behavior_profile,
        budget_guard,
        mode,
    )

    result = {
        "questions": questions,
        "need_score": need_score,
        "need_level": need_level,
        "scoring_rationale": scoring_rationale,
        "awaiting_answers": False,
    }

    duration_ms = int((time.monotonic() - started) * 1000)
    traces = list(state.get("agent_traces") or [])
    traces.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": "need_analyzer",
            "status": "completed",
            "duration_ms": duration_ms,
            "input_summary": f"Döngü {cycle_iteration}, cevap sayısı: {len(user_answers)}",
            "output_summary": f"İhtiyaç skoru: {need_score}/100, seviye: {need_level}",
            "key_findings": [scoring_rationale],
            "triggered_actions": [],
        }
    )

    return {"need_analyzer_output": result, "agent_traces": traces}
