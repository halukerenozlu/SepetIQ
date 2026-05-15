"""
Supabase Client
---------------
Supabase bağlantısını yönetir. Tüm DB operasyonları buradan geçer.

TODO (gerçek implementasyon):
  - SUPABASE_URL ve SUPABASE_KEY .env'den oku
  - get_user_purchases(user_id) → past_purchases listesi döndür
  - save_decision(decision_data) → decisions tablosuna kaydet
  - get_demo_product(product_id) → demo_products tablosundan çek
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client():
    """Returns a Supabase client instance (lazy init)."""
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        # TODO: Raise a proper error in production; for now return None (dev mode)
        return None

    from supabase import create_client  # type: ignore

    _client = create_client(url, key)
    return _client


async def get_user_purchases(user_id: str) -> list[dict]:
    """Fetches past purchases for a user from Supabase."""
    # TODO: Implement real Supabase query
    # client = get_client()
    # result = client.table("user_purchases").select("*").eq("user_id", user_id).execute()
    # return result.data
    return []


async def save_decision(decision_data: dict) -> str:
    """Saves a completed decision to the decisions table. Returns decision_id."""
    # TODO: Implement real Supabase insert
    import uuid

    return f"dec_{uuid.uuid4().hex[:8]}"
