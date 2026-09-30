-- Migration: 001-crop-wrapped.sql
-- Adds Crop Wrapped feature support
-- Run: psql -d farm_revenue_copilot -f migrations/001-crop-wrapped.sql

-- ── Farmer actions (track what farmers actually did) ─────────────────
CREATE TABLE IF NOT EXISTS farmer_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   UUID NOT NULL REFERENCES recommendation_events(id) ON DELETE CASCADE,
  farmer_id           UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  crop_id             UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  followed            TEXT NOT NULL,     -- FOLLOWED | NOT_FOLLOWED | UNKNOWN
  action_detail       TEXT,              -- Optional description of what farmer did
  source              TEXT DEFAULT 'APP', -- APP | SMS | SYSTEM | OTHER
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_actions_recommendation ON farmer_actions (recommendation_id);
CREATE INDEX IF NOT EXISTS idx_farmer_actions_crop ON farmer_actions (crop_id);
CREATE INDEX IF NOT EXISTS idx_farmer_actions_farmer ON farmer_actions (farmer_id);

-- ── Season support (extend crops for season tracking) ─────────────────
-- Add season name and completion tracking to existing crops table
ALTER TABLE crops 
ADD COLUMN IF NOT EXISTS season_name TEXT;

ALTER TABLE crops 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add indexes for season queries
CREATE INDEX IF NOT EXISTS idx_crops_status ON crops (status);
CREATE INDEX IF NOT EXISTS idx_crops_season ON crops (farmer_id, season_name);

-- ── Update crops for completed seasons ────────────────────────────────
-- Mark harvested crops as completed
UPDATE crops 
SET completed_at = NOW() 
WHERE status = 'harvested' AND completed_at IS NULL;
