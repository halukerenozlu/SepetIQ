"""
Need Analyzer Agent
-------------------
İki aşamalı çalışır:
  1. İlk çalışma (cycle_iteration == 0): Gemini ile 3 Türkçe soru üretir.
  2. İkinci çalışma (cycle_iteration >= 1, user_answers dolu): Saf Python ile ihtiyaç skoru hesaplar.
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
    "Questions should uncover: actual use case, frequency of use, whether they already own something similar. "
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
- q1: ask about use frequency or main use case
- q2: ask whether they already own something similar (yes_no)
- q3: ask about urgency or when they actually need it
- For "impulsive" profile, make questions more probing
- For "strict" mode, add a question about budget planning
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
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")
        _structured_chain = llm.with_structured_output(QuestionsOutput)
    return _structured_chain


# ---------------------------------------------------------------------------
# İkinci çalışma: saf Python skorlama
# ---------------------------------------------------------------------------


def _score_need(
    user_answers: dict[str, Any],
    behavior_profile: dict[str, Any],
    mode: str,
) -> tuple[int, str, str]:
    """(need_score, need_level, scoring_rationale) döndürür."""
    score = 50

    # q2: benzer ürüne zaten sahip → ihtiyacı düşür
    if user_answers.get("q2") == "Evet":
        score -= 25

    # q3: aciliyet sinyalleri
    urgency_answer = str(user_answers.get("q3") or "").lower()
    if "hemen" in urgency_answer or "bugün" in urgency_answer:
        score += 15
    elif "emin değilim" in urgency_answer or "belki" in urgency_answer:
        score -= 10

    # Davranış profili modifiye
    impulsivity_score = int(behavior_profile.get("impulsivity_score") or 50)
    if impulsivity_score >= 70:
        score -= 15  # dürtüsel alıcı → aciliyete güvenme
    elif impulsivity_score <= 30:
        score += 10  # bilinçli alıcı → ihtiyacına güven

    # Mod modifiye
    if mode == "strict":
        score -= 10
    elif mode == "soft":
        score += 5

    need_score = max(0, min(100, score))

    # need_level
    if need_score >= 70:
        need_level = "high"
    elif need_score >= 40:
        need_level = "medium"
    else:
        need_level = "low"

    # scoring_rationale — Gemini çağrısı yok, Python'da oluştur
    rationale_parts: list[str] = []
    if user_answers.get("q2") == "Evet":
        rationale_parts.append("benzer bir ürüne zaten sahip")
    if impulsivity_score >= 70:
        rationale_parts.append("dürtüsel alışveriş eğilimi tespit edildi")
    if mode == "strict":
        rationale_parts.append("disiplinli mod aktif")

    if rationale_parts:
        scoring_rationale = "İhtiyaç skoru düşürüldü: " + ", ".join(rationale_parts) + "."
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

    profile_tag: str = behavior_profile.get("profile_tag") or "unknown"
    impulsivity_score: int = int(behavior_profile.get("impulsivity_score") or 50)

    is_first_run = (cycle_iteration == 0) or (not user_answers)

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
            if len(questions) == 3:
                gemini_ok = True

        if not gemini_ok:
            questions = list(_FALLBACK_QUESTIONS)

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

    need_score, need_level, scoring_rationale = _score_need(user_answers, behavior_profile, mode)

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
