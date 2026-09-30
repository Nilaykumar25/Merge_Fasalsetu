-- ============================================================================
-- ADD SENSOR READINGS TABLE to existing AnnaVriddhi Supabase schema
-- Safe to run — uses IF NOT EXISTS / conditional policy creation
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Create sensor_readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id       UUID        NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  farmer_id     UUID        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  sensor_id     TEXT,
  reading_type  TEXT        NOT NULL,   -- soil_moisture_pct | soil_temperature_c | soil_ph | nitrogen_kgac | phosphorus_kgac | potassium_kgac
  value         NUMERIC(10,4) NOT NULL,
  unit          TEXT,
  optimal_range TEXT,
  source        TEXT        NOT NULL DEFAULT 'sensor',  -- 'sensor' | 'manual'
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_crop        ON sensor_readings(crop_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farmer      ON sensor_readings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_crop_type   ON sensor_readings(crop_id, reading_type);

-- 3. Enable RLS
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- 4. SELECT policy — farmers see only their own crop readings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sensor_readings' AND policyname = 'sensor_readings_select'
  ) THEN
    CREATE POLICY "sensor_readings_select"
      ON sensor_readings FOR SELECT
      USING (farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text));
  END IF;
END $$;

-- 5. INSERT policy — farmers can insert for their own crops
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sensor_readings' AND policyname = 'sensor_readings_insert'
  ) THEN
    CREATE POLICY "sensor_readings_insert"
      ON sensor_readings FOR INSERT
      WITH CHECK (farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text));
  END IF;
END $$;

-- 6. Also add updated_at to farmers if missing (frontend expects it)
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Enable Realtime for live sensor updates on the dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;

-- Done.
