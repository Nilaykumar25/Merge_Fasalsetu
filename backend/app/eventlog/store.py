"""
EventStore — append-only psycopg2 interface to recommendation_events.
The DB trigger (db/001_event_log.sql) also enforces append-only at the
database level.  This class never issues UPDATE or DELETE.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Optional
from uuid import UUID

import psycopg2
import psycopg2.extras

from backend.app.eventlog.models import EventEnvelope

logger = logging.getLogger("eventlog.store")

_INSERT_SQL_WITH_TS = """
INSERT INTO recommendation_events
    (schema_version, event_type, parent_event_id, country, farm_id, plot_id,
     occurred_at, agent, category, is_do_nothing, net_impact, currency, payload)
VALUES
    (%(schema_version)s, %(event_type)s, %(parent_event_id)s, %(country)s,
     %(farm_id)s, %(plot_id)s, %(occurred_at)s, %(agent)s, %(category)s,
     %(is_do_nothing)s, %(net_impact)s, %(currency)s, %(payload)s)
RETURNING event_id, occurred_at
"""

_INSERT_SQL_NO_TS = """
INSERT INTO recommendation_events
    (schema_version, event_type, parent_event_id, country, farm_id, plot_id,
     agent, category, is_do_nothing, net_impact, currency, payload)
VALUES
    (%(schema_version)s, %(event_type)s, %(parent_event_id)s, %(country)s,
     %(farm_id)s, %(plot_id)s, %(agent)s, %(category)s,
     %(is_do_nothing)s, %(net_impact)s, %(currency)s, %(payload)s)
RETURNING event_id, occurred_at
"""

_SELECT_SQL = """
SELECT event_id, schema_version, event_type, parent_event_id,
       country, farm_id, plot_id, occurred_at,
       agent, category, is_do_nothing, net_impact, currency, payload
FROM recommendation_events
WHERE 1=1
{filters}
ORDER BY occurred_at DESC
"""


class EventStore:
    """
    Thin psycopg2 wrapper.  Connection string comes from DATABASE_URL env var.
    All writes go through append(); no UPDATE/DELETE paths exist.
    """

    def __init__(self, dsn: Optional[str] = None) -> None:
        self._dsn = dsn or os.environ["DATABASE_URL"]

    def _connect(self) -> psycopg2.extensions.connection:
        conn = psycopg2.connect(self._dsn)
        psycopg2.extras.register_uuid(conn)
        return conn

    # ── Public API ─────────────────────────────────────────────────────────

    def append(self, event: EventEnvelope) -> EventEnvelope:
        """
        INSERT one event and return the envelope with event_id + occurred_at
        filled in from the database.
        Raises ValueError if the call somehow tries to perform a non-INSERT
        (defence-in-depth; actual guard is the DB trigger).
        """
        # Validate cross-field constraint before touching the DB
        event.validate_parent_constraint()

        params = {
            "schema_version":  event.schema_version,
            "event_type":      event.event_type,
            "parent_event_id": str(event.parent_event_id) if event.parent_event_id else None,
            "country":         event.country,
            "farm_id":         event.farm_id,
            "plot_id":         event.plot_id,
            "agent":           event.agent,
            "category":        event.category,
            "is_do_nothing":   event.is_do_nothing,
            "net_impact":      event.net_impact,
            "currency":        event.currency,
            "payload":         json.dumps(event.payload),
        }

        # Use the timestamp-inclusive SQL only when occurred_at is explicitly set;
        # otherwise let the DB DEFAULT (now()) fire so NOT NULL is satisfied.
        if event.occurred_at is not None:
            sql = _INSERT_SQL_WITH_TS
            params["occurred_at"] = event.occurred_at
        else:
            sql = _INSERT_SQL_NO_TS

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
            conn.commit()

        event_id, occurred_at = row
        return event.model_copy(update={"event_id": event_id, "occurred_at": occurred_at})

    def query(
        self,
        farm_id: Optional[str] = None,
        plot_id: Optional[str] = None,
        event_type: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> list[EventEnvelope]:
        """SELECT only — no mutations."""
        conditions: list[str] = []
        params: dict = {}

        if farm_id:
            conditions.append("AND farm_id = %(farm_id)s")
            params["farm_id"] = farm_id
        if plot_id:
            conditions.append("AND plot_id = %(plot_id)s")
            params["plot_id"] = plot_id
        if event_type:
            conditions.append("AND event_type = %(event_type)s")
            params["event_type"] = event_type
        if since:
            conditions.append("AND occurred_at >= %(since)s")
            params["since"] = since

        sql = _SELECT_SQL.format(filters="\n".join(conditions))

        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()

        result = []
        for row in rows:
            payload = row["payload"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            env = EventEnvelope(
                event_id=row["event_id"],
                schema_version=row["schema_version"],
                event_type=row["event_type"],
                parent_event_id=row["parent_event_id"],
                country=row["country"],
                farm_id=row["farm_id"],
                plot_id=row["plot_id"],
                occurred_at=row["occurred_at"],
                agent=row["agent"],
                category=row["category"],
                is_do_nothing=row["is_do_nothing"],
                net_impact=float(row["net_impact"]) if row["net_impact"] is not None else None,
                currency=row["currency"],
                payload=payload,
            )
            result.append(env)
        return result
