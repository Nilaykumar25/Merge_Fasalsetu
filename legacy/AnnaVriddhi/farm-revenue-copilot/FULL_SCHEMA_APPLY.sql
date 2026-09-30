-- ============================================================================
-- AnnaVriddhi — FULL SCHEMA SETUP (Clean slate version)
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste and run STEP 1 first (drops everything)
-- 3. Then paste and run STEP 2 (creates everything fresh)
-- ============================================================================


-- ============================================================================
-- STEP 1 — DROP EVERYTHING (run this block first, alone)
-- ============================================================================

DROP TABLE IF EXISTS sync_log                    CASCADE;
DROP TABLE IF EXISTS activity_log                CASCADE;
DROP TABLE IF EXISTS field_scans                 CASCADE;
DROP TABLE IF EXISTS fertilizer_applications     CASCADE;
DROP TABLE IF EXISTS harvest_plans               CASCADE;
DROP TABLE IF EXISTS weather_forecast            CASCADE;
DROP TABLE IF EXISTS season_reviews              CASCADE;
DROP TABLE IF EXISTS seasons                     CASCADE;
DROP TABLE IF EXISTS messages                    CASCADE;
DROP TABLE IF EXISTS alerts                      CASCADE;
DROP TABLE IF EXISTS recommendations             CASCADE;
DROP TABLE IF EXISTS farmer_scheme_applications  CASCADE;
DROP TABLE IF EXISTS government_schemes          CASCADE;
DROP TABLE IF EXISTS user_settings               CASCADE;
DROP TABLE IF EXISTS crop_health_daily           CASCADE;
DROP TABLE IF EXISTS sensor_readings             CASCADE;
DROP TABLE IF EXISTS crops                       CASCADE;
DROP TABLE IF EXISTS plots                       CASCADE;
DROP TABLE IF EXISTS farmers                     CASCADE;

DROP VIEW IF EXISTS farmer_crop_overview CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS create_user_settings_on_farmer_creation() CASCADE;


-- ============================================================================
-- STEP 2 — CREATE EVERYTHING (run this block after Step 1 succeeds)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. FARMERS ────────────────────────────────────────────────────────────────
CREATE TABLE farmers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id       TEXT        NOT NULL UNIQUE,
  name               TEXT        NOT NULL,
  phone              TEXT        UNIQUE,
  state              TEXT,
  district           TEXT,
  village            TEXT,
  total_area_acres   FLOAT,
  preferred_language TEXT        DEFAULT 'English',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmers_select_own" ON farmers FOR SELECT USING (auth_user_id = auth.uid()::text);
CREATE POLICY "farmers_insert_own" ON farmers FOR INSERT WITH CHECK (auth_user_id = auth.uid()::text);
CREATE POLICY "farmers_update_own" ON farmers FOR UPDATE USING (auth_user_id = auth.uid()::text);

-- ── 2. PLOTS ──────────────────────────────────────────────────────────────────
CREATE TABLE plots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id    UUID        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  area_acres   FLOAT,
  soil_type    TEXT,
  location_lat FLOAT,
  location_lng FLOAT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plots_select_own" ON plots FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);
CREATE POLICY "plots_insert_own" ON plots FOR INSERT WITH CHECK (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);
CREATE POLICY "plots_update_own" ON plots FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);

-- ── 3. CROPS ──────────────────────────────────────────────────────────────────
CREATE TABLE crops (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id               UUID        NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  crop_name             TEXT        NOT NULL,
  variety               TEXT,
  planted_date          DATE,
  expected_harvest_date DATE,
  current_stage         TEXT,
  health_status         TEXT        DEFAULT 'healthy',
  crop_state            TEXT        DEFAULT 'active',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crops_select_own" ON crops FOR SELECT USING (
  plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text))
);
CREATE POLICY "crops_insert_own" ON crops FOR INSERT WITH CHECK (
  plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text))
);
CREATE POLICY "crops_update_own" ON crops FOR UPDATE USING (
  plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text))
);

-- ── 4. SENSOR READINGS ────────────────────────────────────────────────────────
CREATE TABLE sensor_readings (
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
CREATE INDEX idx_sensor_readings_crop        ON sensor_readings(crop_id);
CREATE INDEX idx_sensor_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX idx_sensor_readings_crop_type   ON sensor_readings(crop_id, reading_type);
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sensor_readings_select" ON sensor_readings FOR SELECT USING (
  crop_id IN (SELECT c.id FROM crops c JOIN plots p ON p.id = c.plot_id JOIN farmers f ON f.id = p.farmer_id WHERE f.auth_user_id = auth.uid()::text)
);
CREATE POLICY "sensor_readings_insert" ON sensor_readings FOR INSERT WITH CHECK (
  crop_id IN (SELECT c.id FROM crops c JOIN plots p ON p.id = c.plot_id JOIN farmers f ON f.id = p.farmer_id WHERE f.auth_user_id = auth.uid()::text)
);

-- ── 5. CROP HEALTH DAILY ──────────────────────────────────────────────────────
CREATE TABLE crop_health_daily (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id            UUID        NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  date               DATE        NOT NULL,
  health_score       INT,
  moisture_pct       FLOAT,
  disease_risk_pct   FLOAT,
  nitrogen_level     FLOAT,
  canopy_cover_pct   FLOAT,
  organic_carbon     FLOAT,
  soil_ph            FLOAT,
  soil_ec            FLOAT,
  canopy_temperature FLOAT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_id, date)
);
CREATE INDEX idx_crop_health_crop ON crop_health_daily(crop_id);
CREATE INDEX idx_crop_health_date ON crop_health_daily(date);
ALTER TABLE crop_health_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crop_health_daily_select" ON crop_health_daily FOR SELECT USING (
  crop_id IN (SELECT c.id FROM crops c JOIN plots p ON p.id = c.plot_id JOIN farmers f ON f.id = p.farmer_id WHERE f.auth_user_id = auth.uid()::text)
);

-- ── 6. RECOMMENDATIONS ───────────────────────────────────────────────────────
CREATE TABLE recommendations (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id                  UUID        NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  farmer_id                UUID        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  type                     TEXT,
  priority                 TEXT,
  title                    TEXT        NOT NULL,
  body                     TEXT,
  why_now                  TEXT,
  predicted_revenue_impact FLOAT,
  actions                  JSONB,
  frequency                TEXT,
  deadline_date            DATE,
  status                   TEXT        DEFAULT 'pending',
  action_taken_date        DATE,
  actual_revenue_impact    FLOAT,
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recommendations_farmer     ON recommendations(farmer_id);
CREATE INDEX idx_recommendations_crop       ON recommendations(crop_id);
CREATE INDEX idx_recommendations_status     ON recommendations(status);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations_select" ON recommendations FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);
CREATE POLICY "recommendations_update" ON recommendations FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);

-- ── 7. ALERTS ─────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id            UUID        REFERENCES crops(id) ON DELETE CASCADE,
  farmer_id          UUID        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  alert_type         TEXT,
  severity           TEXT,
  title              TEXT        NOT NULL,
  description        TEXT,
  affected_area      TEXT,
  risk_level         TEXT,
  action_deadline    DATE,
  recommended_action TEXT,
  estimated_cost     FLOAT,
  status             TEXT        DEFAULT 'active',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  resolved_at        TIMESTAMPTZ
);
CREATE INDEX idx_alerts_farmer     ON alerts(farmer_id);
CREATE INDEX idx_alerts_status     ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select" ON alerts FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);

-- ── 8. PRODUCE GRADES ────────────────────────────────────────────────────────
CREATE TABLE produce_grades (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id                     UUID        NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  batch_number                TEXT,
  grade                       TEXT,
  quality_score               INT,
  grain_size_uniformity_score INT,
  color_ripeness_score        INT,
  surface_quality_score       INT,
  moisture_estimate           FLOAT,
  quantity                    FLOAT,
  market_price_per_unit       FLOAT,
  batch_revenue               FLOAT,
  graded_date                 DATE,
  graded_by                   TEXT,
  image_url                   TEXT,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_produce_grades_crop ON produce_grades(crop_id);
ALTER TABLE produce_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produce_grades_select" ON produce_grades FOR SELECT USING (
  crop_id IN (SELECT c.id FROM crops c JOIN plots p ON p.id = c.plot_id JOIN farmers f ON f.id = p.farmer_id WHERE f.auth_user_id = auth.uid()::text)
);
CREATE POLICY "produce_grades_insert" ON produce_grades FOR INSERT WITH CHECK (
  crop_id IN (SELECT c.id FROM crops c JOIN plots p ON p.id = c.plot_id JOIN farmers f ON f.id = p.farmer_id WHERE f.auth_user_id = auth.uid()::text)
);

-- ── 9. GOVERNMENT SCHEMES ────────────────────────────────────────────────────
CREATE TABLE government_schemes (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_name          TEXT        NOT NULL UNIQUE,
  provider             TEXT,
  category             TEXT,
  description          TEXT,
  benefit_description  TEXT,
  benefit_amount       FLOAT,
  eligibility_criteria JSONB,
  required_documents   JSONB,
  application_deadline DATE,
  state_specific       TEXT,
  is_active            BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE government_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "government_schemes_select" ON government_schemes FOR SELECT USING (is_active = true);

-- ── 10. FARMER SCHEME APPLICATIONS ───────────────────────────────────────────
CREATE TABLE farmer_scheme_applications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id           UUID        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  scheme_id           UUID        NOT NULL REFERENCES government_schemes(id) ON DELETE CASCADE,
  application_status  TEXT        DEFAULT 'eligible',
  estimated_benefit   FLOAT,
  actual_benefit      FLOAT,
  documents_submitted JSONB,
  application_date    DATE,
  approval_date       DATE,
  disbursement_date   DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(farmer_id, scheme_id)
);
CREATE INDEX idx_farmer_schemes_farmer ON farmer_scheme_applications(farmer_id);
ALTER TABLE farmer_scheme_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmer_scheme_applications_select" ON farmer_scheme_applications FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);

-- ── 11. SEASONS ───────────────────────────────────────────────────────────────
CREATE TABLE seasons (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id                UUID        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  season_name              TEXT        NOT NULL,
  start_date               DATE,
  end_date                 DATE,
  crop_id                  UUID        REFERENCES crops(id),
  plot_id                  UUID        REFERENCES plots(id),
  total_revenue_added      FLOAT       DEFAULT 0,
  recommendations_followed INT         DEFAULT 0,
  recommendations_skipped  INT         DEFAULT 0,
  recommendations_partial  INT         DEFAULT 0,
  average_produce_grade    TEXT,
  estimated_yield_impact   FLOAT,
  schemes_applied          INT         DEFAULT 0,
  is_active                BOOLEAN     DEFAULT true,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  ended_at                 TIMESTAMPTZ
);
CREATE INDEX idx_seasons_farmer    ON seasons(farmer_id);
CREATE INDEX idx_seasons_is_active ON seasons(is_active);
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_select" ON seasons FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);

-- ── 12. SEASON REVIEWS ────────────────────────────────────────────────────────
CREATE TABLE season_reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      UUID        NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  review_type    TEXT,
  title          TEXT        NOT NULL,
  body           TEXT,
  insight_date   DATE,
  revenue_impact FLOAT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE season_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_reviews_select" ON season_reviews FOR SELECT USING (
  season_id IN (SELECT id FROM seasons WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text))
);

-- ── 13. MESSAGES ──────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id                 UUID        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  message_type              TEXT,
  title                     TEXT        NOT NULL,
  body                      TEXT,
  channel                   TEXT,
  is_read                   BOOLEAN     DEFAULT false,
  related_crop_id           UUID        REFERENCES crops(id),
  related_recommendation_id UUID        REFERENCES recommendations(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  read_at                   TIMESTAMPTZ
);
CREATE INDEX idx_messages_farmer     ON messages(farmer_id);
CREATE INDEX idx_messages_is_read    ON messages(is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);

-- ── 14. USER SETTINGS ─────────────────────────────────────────────────────────
CREATE TABLE user_settings (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id                UUID        NOT NULL UNIQUE REFERENCES farmers(id) ON DELETE CASCADE,
  preferred_language       TEXT        DEFAULT 'English',
  notification_enabled     BOOLEAN     DEFAULT true,
  notification_channel     TEXT        DEFAULT 'in-app',
  daily_digest_enabled     BOOLEAN     DEFAULT true,
  alert_threshold_settings JSONB,
  theme                    TEXT        DEFAULT 'light',
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT WITH CHECK (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()::text)
);

-- ── 15. AUTO updated_at FUNCTION + TRIGGERS ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_farmers_updated_at         BEFORE UPDATE ON farmers         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_plots_updated_at           BEFORE UPDATE ON plots           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_crops_updated_at           BEFORE UPDATE ON crops           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_recommendations_updated_at BEFORE UPDATE ON recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_seasons_updated_at         BEFORE UPDATE ON seasons         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_user_settings_updated_at   BEFORE UPDATE ON user_settings   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 16. SUPABASE REALTIME ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;

-- ============================================================================
-- Done. All tables created successfully.
-- ============================================================================
