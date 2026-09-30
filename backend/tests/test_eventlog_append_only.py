"""
test_eventlog_append_only.py — Task 1.4.1

Tests:
  test_valid_append_returns_event       — insert a minimal valid event, assert UUID returned.
  test_update_blocked                   — psycopg2 UPDATE → exception from DB trigger.
  test_delete_blocked                   — psycopg2 DELETE → exception from DB trigger.
  test_check_constraint_parent_null     — recommendation with parent_event_id → IntegrityError.
  test_schema_validation                — every event validates against recommendation_event.schema.json.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

import jsonschema
import psycopg2
import pytest

SCHEMA_PATH = Path(__file__).parents[2] / "schemas" / "recommendation_event.schema.json"


def _load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text())


# ── Helpers ────────────────────────────────────────────────────────────────

def _insert_raw(conn, event_type: str, parent_event_id=None, extra: dict | None = None) -> uuid.UUID:
    """Direct psycopg2 INSERT — bypasses EventStore so we can test the trigger."""
    import json as _json
    payload = {
        "agent": "orchestrator",
        "category": "do_nothing",
        "is_do_nothing": True,
        "crop_condition": {
            "score": 50,
            "components": {"soil_moisture": {"value": None, "source": "simulated"}},
        },
        "revenue": {
            "formula_version": "1.0",
            "currency": "INR",
            "net_impact": 0.0,
            "assumptions": {
                "price_source": "MSP",
                "yield_baseline": "stub",
                "risk_discount_rate": 0.10,
                "estimated": True,
            },
        },
        "action": {"template_key": "do_nothing"},
        "guardrail": {"ruleset": "in@2026.09", "pre": "pass", "post": "pass"},
    }
    if extra:
        payload.update(extra)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO recommendation_events
                (event_type, parent_event_id, country, farm_id, plot_id,
                 agent, category, is_do_nothing, net_impact, currency, payload)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING event_id
            """,
            (
                event_type,
                str(parent_event_id) if parent_event_id else None,
                "IN",
                "farm_test",
                "plot_test",
                "orchestrator",
                "do_nothing",
                True,
                0.0,
                "INR",
                _json.dumps(payload),
            ),
        )
        row = cur.fetchone()
    conn.commit()
    return row[0]


# ── Tests ──────────────────────────────────────────────────────────────────

def test_valid_append_returns_event(db, minimal_envelope, store):
    """Insert a minimal valid event via EventStore; read back; assert event_id is a UUID."""
    result = store.append(minimal_envelope)

    assert result.event_id is not None, "event_id should be set after append"
    # Must be a valid UUID
    uuid.UUID(str(result.event_id))
    assert result.occurred_at is not None
    assert result.event_type == "recommendation"
    assert result.is_do_nothing is True


def test_update_blocked(db):
    """An UPDATE on recommendation_events should raise an exception (DB trigger)."""
    event_id = _insert_raw(db, "recommendation")
    with pytest.raises(Exception):  # psycopg2.InternalError or ProgrammingError
        with db.cursor() as cur:
            cur.execute(
                "UPDATE recommendation_events SET agent = %s WHERE event_id = %s",
                ("soil", str(event_id)),
            )
        db.commit()
    db.rollback()


def test_delete_blocked(db):
    """A DELETE on recommendation_events should raise an exception (DB trigger)."""
    event_id = _insert_raw(db, "recommendation")
    with pytest.raises(Exception):
        with db.cursor() as cur:
            cur.execute(
                "DELETE FROM recommendation_events WHERE event_id = %s",
                (str(event_id),),
            )
        db.commit()
    db.rollback()


def test_check_constraint_parent_null(db):
    """
    event_type='recommendation' with parent_event_id set must violate the CHECK constraint.
    SQL: CHECK ((event_type = 'recommendation') = (parent_event_id IS NULL))
    """
    some_parent = uuid.uuid4()
    with pytest.raises(Exception) as exc_info:
        _insert_raw(db, "recommendation", parent_event_id=some_parent)
    db.rollback()
    # Could be IntegrityError or InternalError depending on psycopg2 version
    assert exc_info.value is not None


def test_schema_validation(db, store, minimal_envelope):
    """Every event appended in tests must validate against the published JSON Schema."""
    schema = _load_schema()
    validator = jsonschema.Draft202012Validator(schema)

    result = store.append(minimal_envelope)

    # Reconstruct the full event document as the schema expects
    event_doc = {
        "event_id":       str(result.event_id),
        "schema_version": result.schema_version,
        "event_type":     result.event_type,
        "parent_event_id": str(result.parent_event_id) if result.parent_event_id else None,
        "country":        result.country,
        "farm_id":        result.farm_id,
        "plot_id":        result.plot_id,
        "occurred_at":    result.occurred_at.isoformat() if result.occurred_at else None,
        "payload":        result.payload,
    }

    errors = list(validator.iter_errors(event_doc))
    assert errors == [], f"Schema validation errors: {[e.message for e in errors]}"
