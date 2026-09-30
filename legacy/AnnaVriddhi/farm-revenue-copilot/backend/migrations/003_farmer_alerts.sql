-- Migration 003: farmer_alerts table
-- Persistent, per-farmer alerts for NPK deficiencies, irrigation, pest, etc.

CREATE TABLE IF NOT EXISTS farmer_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   UUID NOT NULL,          -- FK to farmers (enforced by app)
  crop_id     UUID,                   -- Optional: which crop this alert is for
  type        TEXT NOT NULL,          -- npk_nitrogen | npk_phosphorus | npk_potassium | irrigation | pest | disease | storm | general
  severity    TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
  title       TEXT NOT NULL,
  message     TEXT,
  data        JSONB DEFAULT '{}',     -- Structured metadata (currentValue, threshold, etc.)
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ             -- NULL = never expires
);

-- Indexes for fast farmer-specific queries
CREATE INDEX IF NOT EXISTS idx_farmer_alerts_farmer     ON farmer_alerts (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_alerts_unread     ON farmer_alerts (farmer_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_farmer_alerts_type       ON farmer_alerts (farmer_id, type);
CREATE INDEX IF NOT EXISTS idx_farmer_alerts_created    ON farmer_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farmer_alerts_crop       ON farmer_alerts (crop_id) WHERE crop_id IS NOT NULL;

-- Also add NPK columns to crop_health_daily if they don't exist
-- (the Supabase schema may already have them)
ALTER TABLE crop_health_daily ADD COLUMN IF NOT EXISTS nitrogen_level   NUMERIC(8,2);
ALTER TABLE crop_health_daily ADD COLUMN IF NOT EXISTS phosphorus_level NUMERIC(8,2);
ALTER TABLE crop_health_daily ADD COLUMN IF NOT EXISTS potassium_level  NUMERIC(8,2);
