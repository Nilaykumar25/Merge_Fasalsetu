"""
test_pipeline_skeleton.py — Task 1.4.3

Tests:
  test_append_before_delivery   — store.append called before MockProvider.send.
  test_do_nothing_event_written — skeleton pipeline writes event with is_do_nothing=True.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, call, patch

import pytest

from backend.app.agents.base import Candidate
from backend.app.core.packs import clear_cache, load as load_pack
from backend.app.eventlog.models import EventEnvelope
from backend.app.orchestrator.pipeline import run_pipeline


@pytest.fixture(autouse=True)
def reset_pack_cache():
    clear_cache()
    yield
    clear_cache()


def _make_mock_store():
    """
    Build a mock EventStore whose append() returns an envelope with a real UUID.
    Call order is tracked so we can assert append() happens before send().
    """
    store = MagicMock()
    call_log: list[str] = []

    def fake_append(envelope: EventEnvelope) -> EventEnvelope:
        call_log.append("append")
        return envelope.model_copy(
            update={
                "event_id": uuid.uuid4(),
                "occurred_at": datetime.now(timezone.utc),
            }
        )

    store.append.side_effect = fake_append
    store._call_log = call_log
    return store


def test_append_before_delivery():
    """
    store.append must be called before MockProvider.send.
    The pipeline rule: log the event BEFORE attempting delivery.
    """
    pack  = load_pack("IN")
    store = _make_mock_store()

    call_order: list[str] = []

    original_append = store.append.side_effect

    def tracking_append(envelope):
        call_order.append("append")
        return original_append(envelope)

    store.append.side_effect = tracking_append

    with patch(
        "backend.app.orchestrator.pipeline.MockProvider.send",
        side_effect=lambda channel, phone, body: (
            call_order.append("send"),
            __import__(
                "backend.app.delivery.base",
                fromlist=["DeliveryReceipt"],
            ).DeliveryReceipt(message_sid="MOCK-X", status="queued", channel=channel),
        )[-1],
    ):
        run_pipeline(
            query="how is my crop?",
            context={"farm_id": "demo", "plot_id": "p1", "country": "IN"},
            pack=pack,
            store=store,
        )

    # append must appear before send in the call order
    assert "append" in call_order, "store.append was never called"
    assert "send" in call_order, "MockProvider.send was never called"
    first_append = call_order.index("append")
    first_send   = call_order.index("send")
    assert first_append < first_send, (
        f"store.append (pos {first_append}) must come before MockProvider.send (pos {first_send})"
    )


def test_do_nothing_event_written():
    """
    The skeleton pipeline (no real agents) must write exactly one recommendation
    event with is_do_nothing=True.
    """
    pack  = load_pack("IN")
    store = _make_mock_store()

    event = run_pipeline(
        query="how is my crop?",
        context={"farm_id": "demo", "plot_id": "p1", "country": "IN"},
        pack=pack,
        store=store,
    )

    # The returned event should be the recommendation (not delivery)
    assert event.event_type == "recommendation"
    assert event.is_do_nothing is True

    # store.append should have been called at least once (rec + delivery)
    assert store.append.call_count >= 1

    # First call must be the recommendation
    first_call_arg: EventEnvelope = store.append.call_args_list[0][0][0]
    assert first_call_arg.event_type == "recommendation"
    assert first_call_arg.is_do_nothing is True
    assert first_call_arg.payload["guardrail"]["pre"] == "pass"
