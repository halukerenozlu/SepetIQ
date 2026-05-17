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

    def _sync_insert() -> str | None:
        try:
            result = client.table("decisions").insert(decision_data).execute()
            if result.data:
                row_id: str = result.data[0].get("id", "")
                logger.info("Decision saved to Supabase: %s", row_id)
                return row_id
            logger.warning("save_decision: insert returned no data")
            return None
        except Exception as exc:
            logger.error("save_decision failed: %s", exc)
            return None

    return await asyncio.to_thread(_sync_insert)
