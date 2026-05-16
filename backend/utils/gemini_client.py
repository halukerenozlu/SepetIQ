"""
Gemini API Rate Limit Utilities
--------------------------------
Circuit breaker + retry wrapper for Gemini calls.
Free tier: 15 RPM, 1500 RPD — single analysis flow with 7 agents can hit limits.

Circuit breaker: After a 429, all Gemini calls return fallback for 60 seconds.
Retry: On 429, retry once (2s delay). If still 429, activate cooldown + fallback.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Circuit breaker state (module-level, shared across all agents)
# ---------------------------------------------------------------------------
_last_429_time: float = 0
_cooldown_seconds: float = 60

# Retry: 1 retry only (first try + 1 retry = 2 total attempts)
_MAX_RETRIES = 1
_RETRY_DELAY_SECONDS = 2.0


def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if the exception is a 429 rate limit error."""
    message = str(exc).lower()
    return "429" in message or "resource_exhausted" in message or "rate" in message


def is_cooldown_active() -> bool:
    """Check if the circuit breaker cooldown is currently active."""
    return time.monotonic() - _last_429_time < _cooldown_seconds


async def invoke_with_retry(
    chain: Any,
    input_data: Any,
    *,
    fallback: T | None = None,
    agent_name: str = "unknown",
) -> T | None:
    """
    Invoke a LangChain chain with circuit breaker + single retry on 429.

    Circuit breaker: If a 429 was seen in the last 60 seconds, skip Gemini
    entirely and return fallback immediately.

    Retry: On 429, wait 2s and retry once. If still 429, activate cooldown
    and return fallback.

    Args:
        chain: LangChain runnable (e.g. llm.with_structured_output(...))
        input_data: Input to pass to chain.ainvoke()
        fallback: Value to return when circuit breaker is active or retries exhausted
        agent_name: For logging purposes

    Returns:
        Chain result or fallback value
    """
    global _last_429_time

    # Circuit breaker: skip Gemini if cooldown is active
    if is_cooldown_active():
        logger.warning(
            "[CIRCUIT_BREAKER] %s: Cooldown aktif (%.0fs kaldı), fallback kullanılıyor",
            agent_name,
            _cooldown_seconds - (time.monotonic() - _last_429_time),
        )
        return fallback

    for attempt in range(_MAX_RETRIES + 1):  # 0, 1 → first try + 1 retry
        try:
            result = await chain.ainvoke(input_data)
            return result  # type: ignore[return-value]
        except Exception as exc:
            if _is_rate_limit_error(exc):
                _last_429_time = time.monotonic()
                if attempt < _MAX_RETRIES:
                    logger.warning(
                        "[RATE_LIMIT] %s: 429 hatası, %ds sonra tekrar denenecek",
                        agent_name,
                        _RETRY_DELAY_SECONDS,
                    )
                    await asyncio.sleep(_RETRY_DELAY_SECONDS)
                else:
                    logger.error(
                        "[RATE_LIMIT] %s: Retry sonrası hâlâ 429, cooldown aktifleştirildi (%ds)",
                        agent_name,
                        _cooldown_seconds,
                    )
                    return fallback
            else:
                # Non-rate-limit error — don't retry, don't activate cooldown
                logger.error("[GEMINI] %s: Hata: %s", agent_name, exc)
                return fallback

    return fallback
