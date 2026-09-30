-- ============================================================================
-- Migration 004: Create sensor_readings table + RLS + Realtime
-- ============================================================================

-- Create table (idempotent)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id       UUID        NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  sensor_id     TEXT,
  reading_type  TEXT        NOT NULL,
  value         FLOAT       NOT NULL,
  unit          TEXT,
  optimal_range TEXT,
  status        TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_crop        ON sensor_readings(crop_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_crop_type   ON sensor_readings(crop_id, reading_type);

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sensor_readings' AND policyname='sensor_readings_select') THEN
    CREATE POLICY "sensor_readings_select" ON sensor_readings FOR SELECT USING (
      crop_id IN (SELECT c.id FROM crops c JOIN plots p ON p.id=c.plot_id JOIN farmers f ON f.id=p.farmer_id WHERE f.auth_user_id=auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sensor_readings' AND policyname='sensor_readings_insert_own') THEN
    CREATE POLICY "sensor_readings_insert_own" ON sensor_readings FOR INSERT WITH CHECK (
      crop_id IN (SELECT c.id FROM crops c JOIN plots p ON p.id=c.plot_id JOIN farmers f ON f.id=p.farmer_id WHERE f.auth_user_id=auth.uid())
    );
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
