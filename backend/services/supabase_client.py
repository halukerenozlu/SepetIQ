"""
Supabase Client
---------------
Supabase bağlantısını yönetir. Tüm DB operasyonları buradan geçer.

Service key kullanılır (RLS bypass için) — backend server-side yazma işlemleri.
"""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client = None


def get_client():
    """Returns a lazy-initialized Supabase client using the service key."""
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL")
    # Service key bypasses RLS — required for server-side inserts.
    # Falls back to anon key for read-only dev usage.
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        logger.debug("Supabase credentials not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY)")
        return None

    from supabase import create_client  # type: ignore[import-untyped]

    _client = create_client(url, key)
    return _client


async def get_user_purchases(user_id: str) -> list[dict]:
    """Fetches past purchases for a user from the past_purchases table."""
    client = get_client()
    if client is None:
        return []

    def _sync_fetch() -> list[dict]:
        try:
            result = client.table("past_purchases").select("*").eq("user_id", user_id).order("purchase_date", desc=True).execute()
            return result.data or []
        except Exception as exc:
            logger.error("get_user_purchases failed for %s: %s", user_id, exc)
            return []

    return await asyncio.to_thread(_sync_fetch)


async def save_decision(decision_data: dict) -> str | None:
    """
    Inserts a completed decision into the decisions table.

    Returns the inserted row's UUID string, or None on any failure.
    Errors are logged but never propagated — caller must not depend on success.
    """
    client = get_client()
    if client is None:
        logger.debug("Supabase not configured, skipping save_decision")
        return None

    def _insert_row(data: dict) -> str | None:
        result = client.table("decisions").insert(data).execute()
        if result.data:
            row_id: str = result.data[0].get("id", "")
            logger.info("Decision saved to Supabase: %s", row_id)
            return row_id
        logger.warning("save_decision: insert returned no data")
        return None

    def _sync_insert() -> str | None:
        try:
            return _insert_row(decision_data)
        except Exception as exc:
            if "score_breakdown" in decision_data and "score_breakdown" in str(exc):
                logger.warning("save_decision: score_breakdown column unavailable, retrying without it")
                retry_data = {k: v for k, v in decision_data.items() if k != "score_breakdown"}
                try:
                    return _insert_row(retry_data)
                except Exception as retry_exc:
                    logger.error("save_decision retry failed: %s", retry_exc)
                    return None
            logger.error("save_decision failed: %s", exc)
            return None

    return await asyncio.to_thread(_sync_insert)


async def save_decision_scores(decision_id: str, score_breakdown: dict) -> None:
    """Persists normalized scores to the legacy decision_scores table."""
    client = get_client()
    if client is None or not decision_id or not score_breakdown:
        return

    def _score(name: str, fallback: int = 50) -> int:
        try:
            return max(0, min(100, int(score_breakdown.get(name, fallback))))
        except (TypeError, ValueError):
            return fallback

    def _sync_upsert() -> None:
        try:
            product_score = _score("product_score")
            need_score = _score("need_score")
            row = {
                "decision_id": decision_id,
                "product_fit": product_score,
                "review_risk": max(0, min(100, 100 - product_score)),
                "need_score": need_score,
                "fit_reasoning": [],
                "risk_factors": [],
                "need_reasoning": [],
            }
            client.table("decision_scores").upsert(row).execute()
        except Exception as exc:
            logger.error("save_decision_scores failed: %s", exc)

    await asyncio.to_thread(_sync_upsert)


async def clear_user_personalization(user_id: str) -> dict[str, int]:
    """Deletes app-owned personalization data while keeping auth/profile consent intact."""
    client = get_client()
    if client is None:
        return {"decisions": 0, "past_purchases": 0}

    def _sync_clear() -> dict[str, int]:
        decisions = client.table("decisions").select("id").eq("user_id", user_id).execute().data or []
        decision_ids = [row["id"] for row in decisions if row.get("id")]

        deleted = {"decisions": len(decision_ids), "past_purchases": 0}

        if decision_ids:
            for table in ("agent_traces", "decision_questions", "decision_scores"):
                client.table(table).delete().in_("decision_id", decision_ids).execute()
            client.table("decisions").delete().in_("id", decision_ids).execute()

        purchase_result = client.table("past_purchases").delete().eq("user_id", user_id).execute()
        deleted["past_purchases"] = len(purchase_result.data or [])

        client.table("user_preferences").upsert(
            {
                "user_id": user_id,
                "default_mode": "balanced",
                "monthly_budget": None,
                "savings_goal": None,
                "notifications_enabled": True,
                "timezone": "Europe/Istanbul",
            }
        ).execute()

        return deleted

    return await asyncio.to_thread(_sync_clear)
