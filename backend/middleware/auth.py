"""
Auth Middleware — JWT + Demo Mode
-----------------------------------
Hackathon öncelikli: auth OPTIONAL.
Geliştirme sırasında hiçbir isteği bloklamaz.

Kullanıcı ID'yi şu sırayla çözümler:
  1. ?demo=true query param → "demo_{user}" (veya "demo_user")
  2. Authorization: Bearer demo-token → "demo_user"
  3. Authorization: Bearer <real-jwt> → Supabase doğrulaması
  4. Header yok / geçersiz → "anonymous"
"""

from __future__ import annotations

import logging
import os

from fastapi import Request

logger = logging.getLogger(__name__)

DEMO_MODE_ENABLED: bool = os.getenv("DEMO_MODE_ENABLED", "false").lower() == "true"


async def get_user_id(request: Request) -> str:
    """
    Extracts or derives a user_id from the incoming request.
    Never raises — falls back to "anonymous".
    """
    # ── 1. Demo query param ───────────────────────────────────────────────────
    if request.query_params.get("demo") == "true":
        user_param = request.query_params.get("user", "user")
        return f"demo_{user_param}"

    # ── 2. Authorization header ───────────────────────────────────────────────
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return "anonymous"

    token = auth_header[len("Bearer ") :].strip()

    # Demo token shortcut
    if token in ("demo-token", "demo_token"):
        return "demo_user"

    # ── 3. Real JWT via Supabase ──────────────────────────────────────────────
    try:
        from services.supabase_client import get_client

        client = get_client()
        if client is None:
            logger.debug("Supabase client not configured, falling back to anonymous")
            return "anonymous"

        user_response = client.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id

    except Exception:  # noqa: BLE001
        logger.debug("JWT validation failed, falling back to anonymous")

    return "anonymous"
