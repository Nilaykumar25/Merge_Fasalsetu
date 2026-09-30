"""
Demo seed — Task 1 stub.  Full seeding in Task 7.
"""
from __future__ import annotations

import logging

from backend.app.core.packs import CountryPack
from backend.app.eventlog.store import EventStore

logger = logging.getLogger("demo.seed")


def seed(store: EventStore, pack: CountryPack) -> None:
    """Insert deterministic demo events.  Task 7 implements fully."""
    logger.info("Demo seed stub — no events inserted yet (Task 7).")
