"""
Delivery provider interface.
Concrete providers (MockProvider, TwilioProvider) implement DeliveryProvider.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class DeliveryReceipt:
    message_sid: Optional[str]
    status: str                 # "queued" | "sent" | "delivered" | "failed"
    channel: str                # "chat" | "sms" | "whatsapp" | "voice"


class DeliveryProvider(ABC):
    """Abstract base for all delivery back-ends."""

    @abstractmethod
    def send(self, channel: str, phone: Optional[str], body: str) -> DeliveryReceipt:
        """
        Send a message to the farmer.

        Args:
            channel: "chat" | "sms" | "whatsapp" | "voice"
            phone:   Destination identifier (phone number or chat session ID).
                     Must never be written to the event log.
            body:    Rendered message text (already language-localised).

        Returns:
            DeliveryReceipt with status.
        """
        ...
