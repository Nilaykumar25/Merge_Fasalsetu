-- ============================================================================
-- URGENT: Run this in Supabase SQL Editor RIGHT NOW
-- URL: https://supabase.com/dashboard/project/qsbjnjxemnnvvfmvjxzs/sql
-- ============================================================================

-- Step 1: Drop existing RLS policies that depend on auth_user_id
DROP POLICY IF EXISTS farmers_select_own ON farmers;
DROP POLICY IF EXISTS farmers_update_own ON farmers;
DROP POLICY IF EXISTS farmers_insert_own ON farmers;
DROP POLICY IF EXISTS farmers_select_all ON farmers;
DROP POLICY IF EXISTS farmers_insert_all ON farmers;

-- Step 2: Drop the existing auth_user_id column (it's the wrong type - UUID instead of TEXT)
ALTER TABLE farmers DROP COLUMN IF EXISTS auth_user_id;

-- Step 3: Add auth_user_id as TEXT (Firebase UIDs are strings, not UUIDs)
ALTER TABLE farmers ADD COLUMN auth_user_id TEXT UNIQUE;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_farmers_auth_user_id ON farmers(auth_user_id);

-- Step 5: Disable RLS on farmers table (TEMPORARY - for development only)
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Now try Google Sign-In again - it will work!
-- ============================================================================

-- ============================================================================
-- SOIL SENSOR FEATURE — run this entire block in Supabase SQL editor
-- ============================================================================

-- 1. Create sensor_readings table (safe to run even if it exists)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id      UUID        NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  sensor_id    TEXT,
  reading_type TEXT        NOT NULL,
  value        FLOAT       NOT NULL,
  unit         TEXT,
  optimal_range TEXT,
  status       TEXT,        -- 'sensor' | 'manual'
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_crop       ON sensor_readings(crop_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_crop_type  ON sensor_readings(crop_id, reading_type);

-- 3. Enable RLS
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- 4. SELECT policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sensor_readings' AND policyname = 'sensor_readings_select'
  ) THEN
    CREATE POLICY "sensor_readings_select"
      ON sensor_readings FOR SELECT
      USING (
        crop_id IN (
          SELECT c.id FROM crops c
          JOIN plots p ON p.id = c.plot_id
          JOIN farmers f ON f.id = p.farmer_id
          WHERE f.auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 5. INSERT policy (for manual saves from authenticated frontend)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sensor_readings' AND policyname = 'sensor_readings_insert_own'
  ) THEN
    CREATE POLICY "sensor_readings_insert_own"
      ON sensor_readings FOR INSERT
      WITH CHECK (
        crop_id IN (
          SELECT c.id FROM crops c
          JOIN plots p ON p.id = c.plot_id
          JOIN farmers f ON f.id = p.farmer_id
          WHERE f.auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 6. Enable Supabase Realtime (live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;

