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

import httpx
from fastapi import Request

logger = logging.getLogger(__name__)

DEMO_MODE_ENABLED: bool = os.getenv("DEMO_MODE_ENABLED", "false").lower() == "true"


async def _get_user_id_from_supabase_auth_rest(token: str) -> str | None:
    """Validates a Supabase access token through the Auth REST API."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.warning("Supabase auth REST validation skipped: missing SUPABASE_URL or API key")
        return None

    auth_url = f"{url.rstrip('/')}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                auth_url,
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {token}",
                },
            )
    except Exception:
        logger.exception("Supabase auth REST validation request failed")
        return None

    if response.status_code != 200:
        logger.warning(
            "Supabase auth REST validation failed: status=%s body=%s",
            response.status_code,
            response.text[:300],
        )
        return None

    user_data = response.json()
    user_id = user_data.get("id")
    if isinstance(user_id, str) and user_id:
        return user_id

    logger.warning("Supabase auth REST validation returned no user id")
    return None


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
            logger.warning("Supabase client not configured, trying auth REST fallback")
            rest_user_id = await _get_user_id_from_supabase_auth_rest(token)
            return rest_user_id or "anonymous"

        user_response = client.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id

        logger.warning("Supabase client JWT validation returned no user, trying auth REST fallback")

    except Exception:  # noqa: BLE001
        logger.exception("Supabase client JWT validation failed, trying auth REST fallback")

    rest_user_id = await _get_user_id_from_supabase_auth_rest(token)
    if rest_user_id:
        return rest_user_id

    logger.warning("JWT validation failed, falling back to anonymous")
    return "anonymous"
