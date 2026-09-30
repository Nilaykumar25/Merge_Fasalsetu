"""
MockProvider — logs message to stdout and appends a delivery event.
Used for demos and tests; loaded when FS_DELIVERY_PROVIDER=mock (default).
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from backend.app.delivery.base import DeliveryProvider, DeliveryReceipt

logger = logging.getLogger("delivery.mock")


class MockProvider(DeliveryProvider):
    """
    Simulates delivery by printing to stdout.
    Callers are responsible for appending the delivery event to the store;
    this provider returns the receipt so pipeline.py can construct the event.
    """

    def send(self, channel: str, phone: Optional[str], body: str) -> DeliveryReceipt:
        sid = f"MOCK-{uuid.uuid4().hex[:12].upper()}"
        print(
            f"[MockProvider] channel={channel} to={phone or 'chat'} "
            f"sid={sid}\n{body}\n"
        )
        logger.info("MockProvider queued message sid=%s channel=%s", sid, channel)
        return DeliveryReceipt(
            message_sid=sid,
            status="queued",
            channel=channel,
        )

    def build_delivery_payload(
        self,
        receipt: DeliveryReceipt,
        language: str,
    ) -> dict[str, Any]:
        """Convenience: build the payload dict for the delivery event."""
        return {
            "channel":      receipt.channel,
            "language":     language,
            "status":       receipt.status,
            "provider_ref": receipt.message_sid,
        }
