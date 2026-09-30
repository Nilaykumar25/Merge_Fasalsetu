-- PostgreSQL 15+. Append-only event store. Nothing updates or deletes rows.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE recommendation_events (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version  text        NOT NULL DEFAULT '1.0.0',
  event_type      text        NOT NULL CHECK (event_type IN ('recommendation','delivery','response','outcome')),
  parent_event_id uuid        REFERENCES recommendation_events(event_id),
  country         char(2)     NOT NULL,
  farm_id         text        NOT NULL,
  plot_id         text,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  -- denormalised for querying; payload is the source of truth
  agent           text,
  category        text,
  is_do_nothing   boolean,
  net_impact      numeric(14,2),
  currency        char(3),
  payload         jsonb       NOT NULL,
  CHECK ((event_type = 'recommendation') = (parent_event_id IS NULL))
);

CREATE INDEX ON recommendation_events (farm_id, occurred_at DESC);
CREATE INDEX ON recommendation_events (plot_id, occurred_at DESC);
CREATE INDEX ON recommendation_events (parent_event_id);
CREATE INDEX ON recommendation_events USING gin (payload jsonb_path_ops);

-- Enforce append-only in the database, not just in app code.
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'recommendation_events is append-only'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER no_update BEFORE UPDATE OR DELETE ON recommendation_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- One row per recommendation with its latest delivery / response / outcome.
CREATE VIEW recommendation_lifecycle AS
SELECT r.event_id, r.country, r.farm_id, r.plot_id, r.occurred_at,
       r.agent, r.category, r.is_do_nothing, r.net_impact AS predicted_impact, r.currency,
       d.payload->>'channel' AS channel,
       d.payload->>'status'  AS delivery_status,
       s.payload->>'acted'   AS acted,
       o.realized            AS realized_impact
FROM recommendation_events r
LEFT JOIN LATERAL (SELECT payload FROM recommendation_events
   WHERE parent_event_id = r.event_id AND event_type='delivery'
   ORDER BY occurred_at DESC LIMIT 1) d ON true
LEFT JOIN LATERAL (SELECT payload FROM recommendation_events
   WHERE parent_event_id = r.event_id AND event_type='response'
   ORDER BY occurred_at DESC LIMIT 1) s ON true
LEFT JOIN LATERAL (SELECT (payload->>'realized_impact')::numeric AS realized
   FROM recommendation_events
   WHERE parent_event_id = r.event_id AND event_type='outcome'
   ORDER BY occurred_at DESC LIMIT 1) o ON true
WHERE r.event_type = 'recommendation';

-- Season Review ("Crop Wrapped") reads from here.
CREATE VIEW season_summary AS
SELECT farm_id, plot_id, date_trunc('month', occurred_at) AS month,
       count(*) FILTER (WHERE NOT is_do_nothing)          AS actions_recommended,
       count(*) FILTER (WHERE is_do_nothing)              AS do_nothing_calls,
       count(*) FILTER (WHERE acted IN ('yes','partial')) AS actions_taken,
       sum(predicted_impact) FILTER (WHERE acted IN ('yes','partial')) AS predicted_impact_taken,
       sum(realized_impact)                               AS realized_impact
FROM recommendation_lifecycle
GROUP BY 1,2,3;
