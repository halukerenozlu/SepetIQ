"""
Decision Store — In-Memory
---------------------------
Active decision'ları bellekte tutar.

Her decision bir DecisionRecord içerir:
  - sse_queue:    SSE stream'e event göndermek için asyncio.Queue
  - answer_event: kullanıcı cevabı gelene kadar pipeline'ı bekletir
  - status:       "running" | "waiting_answers" | "completed" | "failed"
  - result:       Pipeline tamamlandıktan sonra nihai sonuç
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class DecisionRecord:
    decision_id: str
    user_id: str
    mode: str
    product_url: str
    status: str  # "running" | "waiting_answers" | "completed" | "failed"
    sse_queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    answer_event: asyncio.Event = field(default_factory=asyncio.Event)
    user_answers: dict[str, Any] | None = None
    result: dict[str, Any] | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# decision_id -> DecisionRecord
_store: dict[str, DecisionRecord] = {}


def create(
    decision_id: str,
    user_id: str,
    mode: str,
    product_url: str,
) -> DecisionRecord:
    """Creates and registers a new decision record."""
    record = DecisionRecord(
        decision_id=decision_id,
        user_id=user_id,
        mode=mode,
        product_url=product_url,
        status="running",
    )
    _store[decision_id] = record
    return record


def get(decision_id: str) -> DecisionRecord | None:
    """Returns the record for the given decision_id, or None."""
    return _store.get(decision_id)


def remove(decision_id: str) -> None:
    """Removes a decision record from the store."""
    _store.pop(decision_id, None)


def list_all() -> list[DecisionRecord]:
    """Returns all active decision records (for debugging)."""
    return list(_store.values())
