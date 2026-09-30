"""
Shared pytest fixtures for the FasalSetu backend test suite.
Tests that need a real DB connection use the FASALSETU_TEST_DB env var
and are automatically skipped when it is absent.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# ── DB fixture ─────────────────────────────────────────────────────────────

TEST_DB_URL = os.environ.get("FASALSETU_TEST_DB", "")


def pytest_collection_modifyitems(items):
    """Auto-skip DB tests when FASALSETU_TEST_DB is not set."""
    skip_db = pytest.mark.skip(reason="FASALSETU_TEST_DB not set")
    for item in items:
        if "db" in item.fixturenames and not TEST_DB_URL:
            item.add_marker(skip_db)


@pytest.fixture
def db():
    """
    Yield a psycopg2 connection scoped to a fresh per-test PostgreSQL schema.
    The schema is created, the event-log DDL is applied inside it, and it is
    dropped on teardown.  Skipped when FASALSETU_TEST_DB is not set.
    """
    if not TEST_DB_URL:
        pytest.skip("FASALSETU_TEST_DB not set")

    import psycopg2
    import psycopg2.extras

    schema_name = f"test_{uuid.uuid4().hex[:8]}"
    sql_path = Path(__file__).parents[2] / "db" / "001_event_log.sql"

    # Connection used for setup/teardown (autocommit so DDL runs outside a txn)
    admin_conn = psycopg2.connect(TEST_DB_URL)
    admin_conn.autocommit = True
    with admin_conn.cursor() as cur:
        cur.execute(f"CREATE SCHEMA {schema_name}")

    # Separate connection that sets search_path to the isolated schema; this is
    # what both the raw-SQL helper tests and EventStore will use.
    conn = psycopg2.connect(TEST_DB_URL, options=f"-c search_path={schema_name},public")
    psycopg2.extras.register_uuid(conn)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(sql_path.read_text())
    conn.autocommit = False

    yield conn

    # Teardown
    conn.close()
    with admin_conn.cursor() as cur:
        cur.execute(f"DROP SCHEMA {schema_name} CASCADE")
    admin_conn.close()


@pytest.fixture
def store(db):
    """
    EventStore wired to the same isolated per-test schema as the `db` fixture.
    We extract the DSN (including the search_path option) from the live connection
    so EventStore opens connections in the same schema.
    """
    from backend.app.eventlog.store import EventStore

    # Build a DSN that pins the search_path to match the db fixture's connection.
    # db.info.options contains "-c search_path=<schema>,public"
    import psycopg2
    dsn_parts = psycopg2.extensions.parse_dsn(TEST_DB_URL)
    schema_option = db.info.options  # e.g. "-c search_path=test_abc123,public"
    # Reconstruct DSN string with the options parameter
    dsn_with_schema = TEST_DB_URL + (
        f"?options={schema_option.replace(' ', '%20')}"
        if "?" not in TEST_DB_URL else
        f"&options={schema_option.replace(' ', '%20')}"
    )

    # Simpler approach: monkey-patch _connect on the store to reuse the fixture conn
    store_instance = EventStore(dsn=TEST_DB_URL)

    # Override _connect to return a new connection with the correct search_path
    def _scoped_connect():
        c = psycopg2.connect(TEST_DB_URL, options=db.info.options)
        psycopg2.extras.register_uuid(c)
        return c

    store_instance._connect = _scoped_connect
    return store_instance


@pytest.fixture
def india_pack():
    """Load the India country pack (full)."""
    from backend.app.core import packs
    packs.clear_cache()
    return packs.load("IN")


@pytest.fixture
def brazil_pack():
    """Load the Brazil country pack (thin)."""
    from backend.app.core import packs
    packs.clear_cache()
    return packs.load("BR")


@pytest.fixture
def minimal_rec_payload():
    """Minimal valid recommendation payload matching the JSON Schema."""
    return {
        "agent": "orchestrator",
        "category": "do_nothing",
        "is_do_nothing": True,
        "crop_condition": {
            "score": 50,
            "components": {
                "soil_moisture": {"value": None, "source": "simulated"},
            },
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
        "guardrail": {
            "ruleset": "in@2026.09",
            "pre": "pass",
            "post": "pass",
        },
    }


@pytest.fixture
def minimal_envelope(minimal_rec_payload):
    """Minimal valid EventEnvelope for a recommendation event."""
    from backend.app.eventlog.models import EventEnvelope
    return EventEnvelope(
        event_type="recommendation",
        country="IN",
        farm_id="test_farm",
        plot_id="test_plot",
        agent="orchestrator",
        category="do_nothing",
        is_do_nothing=True,
        net_impact=0.0,
        currency="INR",
        payload=minimal_rec_payload,
    )
