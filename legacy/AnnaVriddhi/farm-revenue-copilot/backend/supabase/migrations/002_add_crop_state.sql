-- ============================================================================
-- Migration 002: Add crop_state column to crops table
-- ============================================================================
-- crop_state tracks the overall life-cycle state of a crop distinct from
-- current_stage (which is an agronomic stage like "Vegetative", "Flowering").
-- Values: 'active' | 'harvested' | 'failed' | 'archived'

ALTER TABLE crops
  ADD COLUMN IF NOT EXISTS crop_state TEXT NOT NULL DEFAULT 'active'
    CHECK (crop_state IN ('active', 'harvested', 'failed', 'archived'));

COMMENT ON COLUMN crops.crop_state IS
  'Life-cycle state of the crop: active | harvested | failed | archived';
