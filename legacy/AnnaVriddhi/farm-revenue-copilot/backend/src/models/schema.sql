-- Farm Revenue Copilot — PostgreSQL schema
-- Run once against your DB: psql -d farm_revenue_copilot -f schema.sql

-- ── Farmers ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farmers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE NOT NULL,
  state         TEXT NOT NULL,
  district      TEXT,
  land_area_ac  NUMERIC(8,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Crops ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id     UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  crop_type     TEXT NOT NULL,           -- e.g. "wheat", "rice", "cotton"
  variety       TEXT,
  sow_date      DATE NOT NULL,
  expected_harvest_date DATE,
  area_ac       NUMERIC(8,2),
  status        TEXT NOT NULL DEFAULT 'active',  -- active | harvested | failed
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Crop-state snapshots (computed by scheduled job) ──────────────────
CREATE TABLE IF NOT EXISTS crop_state_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id       UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  score         SMALLINT CHECK (score BETWEEN 0 AND 100),
  soil_moisture_pct  NUMERIC(5,2),
  leaf_color_score   NUMERIC(5,2),
  pest_pressure_score NUMERIC(5,2),
  growth_stage_pct   NUMERIC(5,2),
  computed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Grading events ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grading_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id       UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  grade         TEXT NOT NULL,           -- A1, A2, B1, B2, C …
  score         SMALLINT,
  image_url     TEXT,
  breakdown     JSONB,                   -- { color, size, moisture, pestDamage }
  estimated_market_price NUMERIC(10,2),
  currency      TEXT DEFAULT 'INR',
  unit          TEXT DEFAULT 'quintal',
  notes         TEXT,
  graded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Recommendation event log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id          UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,       -- irrigation | fertilizer | pesticide | harvest | scheme
  priority         TEXT NOT NULL,       -- high | medium | low
  title            TEXT NOT NULL,
  body             TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending | acknowledged | dismissed | acted
  action_taken     TEXT,
  action_notes     TEXT,
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Irrigation logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS irrigation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id     UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  amount_mm   NUMERIC(6,2),
  method      TEXT,                     -- drip | sprinkler | flood | manual
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Schemes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schemes (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  short_name              TEXT,
  description             TEXT,
  scheme_type             TEXT NOT NULL,     -- INCOME_SUPPORT | CROP_INSURANCE | CREDIT | etc
  level                   TEXT NOT NULL,     -- CENTRAL | STATE | LOCAL
  ministry                TEXT,
  department              TEXT,
  state                   TEXT,              -- NULL for central schemes
  district_applicability  TEXT[],            -- NULL means all districts in state
  crop_applicability      TEXT[],            -- NULL means all crops
  season_applicability    TEXT[],            -- NULL means all seasons (Kharif/Rabi/Zaid)
  activity_applicability  TEXT[],            -- BUY_SEED, BUY_EQUIPMENT, INSURE_CROP, etc
  farmer_categories       TEXT[],            -- Small/Marginal, All, Women, etc
  land_size_min_ac        NUMERIC(8,2),
  land_size_max_ac        NUMERIC(8,2),
  eligibility_rules       JSONB,             -- Flexible eligibility conditions
  benefit_type            TEXT,              -- SUBSIDY | DIRECT_TRANSFER | INSURANCE | CREDIT | MSP
  benefit_description     TEXT NOT NULL,
  benefit_amount          NUMERIC(12,2),     -- Fixed amount if applicable
  benefit_percentage      NUMERIC(5,2),      -- Percentage if applicable
  benefit_max_amount      NUMERIC(12,2),     -- Cap if applicable
  benefit_frequency       TEXT,              -- ANNUAL | ONE_TIME | PER_SEASON | etc
  start_date              DATE,
  end_date                DATE,
  application_window_start DATE,
  application_window_end  DATE,
  documents_required      JSONB,             -- Array of required documents
  application_method      TEXT,
  application_url         TEXT,
  official_source         TEXT NOT NULL,     -- Authority name
  official_source_url     TEXT NOT NULL,     -- Official URL
  last_verified_at        TIMESTAMPTZ NOT NULL,
  verification_status     TEXT NOT NULL DEFAULT 'VERIFIED',  -- VERIFIED | NEEDS_REVIEW | EXPIRED
  status                  TEXT NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE | EXPIRED | UPCOMING
  metadata                JSONB,             -- Additional flexible data
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient scheme matching queries
CREATE INDEX IF NOT EXISTS idx_schemes_state ON schemes(state);
CREATE INDEX IF NOT EXISTS idx_schemes_level ON schemes(level);
CREATE INDEX IF NOT EXISTS idx_schemes_type ON schemes(scheme_type);
CREATE INDEX IF NOT EXISTS idx_schemes_status ON schemes(status);
CREATE INDEX IF NOT EXISTS idx_schemes_crops ON schemes USING GIN(crop_applicability);
CREATE INDEX IF NOT EXISTS idx_schemes_activities ON schemes USING GIN(activity_applicability);

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crops_farmer      ON crops (farmer_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_crop    ON crop_state_snapshots (crop_id);
CREATE INDEX IF NOT EXISTS idx_rec_events_crop   ON recommendation_events (crop_id);
CREATE INDEX IF NOT EXISTS idx_grading_crop      ON grading_events (crop_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_crop   ON irrigation_logs (crop_id);

-- ── Schema Alterations ────────────────────────────────────────────────
-- Add predicted revenue impact tracking to recommendations
ALTER TABLE recommendation_events 
ADD COLUMN IF NOT EXISTS predicted_revenue_impact NUMERIC(10,2);

-- Add data quality tracking to crop state snapshots
ALTER TABLE crop_state_snapshots 
ADD COLUMN IF NOT EXISTS data_quality TEXT DEFAULT 'complete';

-- Add delivery tracking to recommendations
ALTER TABLE recommendation_events
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add revenue impact percentage tracking to recommendations (Feature A)
ALTER TABLE recommendation_events
ADD COLUMN IF NOT EXISTS revenue_impact_pct NUMERIC(5,2);

-- Note: recommendation_events.type supports values:
-- 'irrigation', 'fertilizer', 'pesticide', 'cover', 'do_nothing', 'harvest', 'scheme'

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

-- ── AI Advisor Conversations (Feature B) ─────────────────────────────
-- Optional: for persisting conversation history and analytics
CREATE TABLE IF NOT EXISTS advisor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_conversations_farmer ON advisor_conversations (farmer_id);
CREATE INDEX IF NOT EXISTS idx_advisor_conversations_created ON advisor_conversations (created_at DESC);
