from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from middleware.auth import get_user_id
from services import supabase_client

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.delete("/me/data")
async def clear_my_data(request: Request) -> dict:
    user_id = await get_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    deleted = await supabase_client.clear_user_personalization(user_id)
    return {"ok": True, "deleted": deleted}
