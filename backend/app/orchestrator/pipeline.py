"""
Canonical pipeline — enforced order from structure.md:
  guardrail.pre -> tracker (stub) -> agents -> revenue -> guardrail.post
  -> eventlog.append(recommendation) -> delivery -> return event

Task 1: tracker returns score=50, agents list is empty, revenue stub returns
net_impact=0 is_do_nothing=True, delivery stub queues via MockProvider.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from backend.app.agents.base import Candidate
from backend.app.core.packs import CountryPack
from backend.app.eventlog.models import EventEnvelope
from backend.app.eventlog.store import EventStore
from backend.app.revenue import assumptions as rev_assumptions
from backend.app.revenue import do_nothing as rev_do_nothing
from backend.app.revenue import formula as rev_formula
from backend.app.guardrail import pre as guardrail_pre
from backend.app.guardrail import post as guardrail_post
from backend.app.delivery.mock_provider import MockProvider

logger = logging.getLogger("orchestrator.pipeline")


def run_pipeline(
    query: str,
    context: dict[str, Any],
    pack: CountryPack,
    store: EventStore,
    *,
    language: Optional[str] = None,
    channel: str = "chat",
    phone: Optional[str] = None,
) -> EventEnvelope:
    """
    Run the full recommendation pipeline and return the logged event.

    Args:
        query:    Raw farmer query text.
        context:  Dict with farm_id, plot_id, country, crop, sensor data, etc.
        pack:     Loaded and validated CountryPack.
        store:    EventStore instance (append-only).
        language: Delivery language code (defaults to pack.default_language).
        channel:  Delivery channel.
        phone:    Farmer contact (never written to the event log).

    Returns:
        The EventEnvelope that was appended to the store.
    """
    farm_id  = context.get("farm_id", "unknown")
    plot_id  = context.get("plot_id")
    country  = context.get("country", pack.code)
    crop     = context.get("crop", "")
    language = language or pack.default_language

    # ── Step 1: guardrail.pre ──────────────────────────────────────────────
    pre_result = guardrail_pre.check(query, pack)
    if pre_result["result"] == "block":
        logger.warning("Pre-guardrail blocked query for farm=%s", farm_id)
        raise PermissionError(
            f"Query blocked by guardrail: {pre_result['rules_triggered']}"
        )

    # ── Step 2: tracker stub (returns score=50) ────────────────────────────
    tracker_score = 50
    crop_condition_payload = {
        "score": tracker_score,
        "components": {
            "soil_moisture":  {"value": None, "source": "simulated"},
            "weather_stress": {"value": None, "source": "simulated"},
            "photo_health":   {"value": None, "source": "simulated"},
            "ndvi":           {"value": None, "source": "simulated"},
        },
    }

    # ── Step 3: agents (empty list for Task 1) ─────────────────────────────
    candidates: list[Candidate] = []

    # ── Step 4: revenue layer ──────────────────────────────────────────────
    plot_info = {"crop": crop}
    priced: list[Candidate] = [rev_formula.apply_revenue(c, plot_info, pack) for c in candidates]

    # Always produce a winner (do_nothing if no candidates beat the threshold)
    winner: Candidate = rev_do_nothing.evaluate(priced, pack)
    assumptions = rev_assumptions.build_assumptions(pack)

    # ── Step 5: guardrail.post ─────────────────────────────────────────────
    rendered_text = f"Your crop condition score is {tracker_score}/100. No action needed at this time."
    post_result = guardrail_post.check(rendered_text, pack)

    # ── Step 6: eventlog.append — BEFORE delivery ──────────────────────────
    rec_payload: dict[str, Any] = {
        "agent":          winner.agent,
        "category":       winner.category,
        "is_do_nothing":  winner.is_do_nothing,
        "crop":           crop or None,
        "crop_condition": crop_condition_payload,
        "revenue": {
            "formula_version":  pack.formula_version,
            "currency":         pack.currency,
            "net_impact":       winner.net_impact if winner.net_impact is not None else 0.0,
            "loss_if_ignored":  winner.loss_if_ignored,
            "confidence":       winner.confidence,
            "assumptions":      assumptions,
        },
        "action": {
            "template_key": winner.template_key,
            "params":       winner.params,
        },
        "guardrail": {
            "ruleset":         pre_result["ruleset"],
            "pre":             pre_result["result"],
            "post":            post_result["result"],
            "rules_triggered": post_result.get("rules_triggered", []),
        },
    }

    envelope = EventEnvelope(
        event_type    = "recommendation",
        country       = country,
        farm_id       = farm_id,
        plot_id       = plot_id,
        agent         = winner.agent,
        category      = winner.category,
        is_do_nothing = winner.is_do_nothing,
        net_impact    = winner.net_impact,
        currency      = pack.currency,
        payload       = rec_payload,
    )

    logged_event = store.append(envelope)
    logger.info(
        "Recommendation logged: event_id=%s is_do_nothing=%s",
        logged_event.event_id,
        logged_event.is_do_nothing,
    )

    # ── Step 7: delivery ───────────────────────────────────────────────────
    provider = MockProvider()
    receipt  = provider.send(channel, phone, rendered_text)

    delivery_payload = provider.build_delivery_payload(receipt, language)
    delivery_envelope = EventEnvelope(
        event_type       = "delivery",
        parent_event_id  = logged_event.event_id,
        country          = country,
        farm_id          = farm_id,
        plot_id          = plot_id,
        payload          = delivery_payload,
    )
    store.append(delivery_envelope)

    return logged_event
