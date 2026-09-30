-- ============================================================================
-- AnnaVriddhi Farm Revenue Copilot - Supabase Schema
-- ============================================================================
-- This schema supports all 20+ screens with real-time crop monitoring,
-- recommendations, grading, government schemes, and season reviews.

-- Enable UUID and other extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. FARMERS TABLE
-- ============================================================================
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  state TEXT,
  district TEXT,
  village TEXT,
  total_area_acres FLOAT,
  preferred_language TEXT DEFAULT 'English',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmers_select_own" ON farmers FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "farmers_insert_own" ON farmers FOR INSERT WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "farmers_update_own" ON farmers FOR UPDATE USING (auth_user_id = auth.uid());

-- ============================================================================
-- 2. PLOTS / FIELDS TABLE
-- ============================================================================
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_acres FLOAT,
  soil_type TEXT,
  location_lat FLOAT,
  location_lng FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plots_select_farmers_plots" ON plots FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "plots_insert_own_plots" ON plots FOR INSERT WITH CHECK (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "plots_update_own_plots" ON plots FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 3. CROPS TABLE
-- ============================================================================
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  variety TEXT,
  planted_date DATE,
  expected_harvest_date DATE,
  current_stage TEXT,
  health_status TEXT DEFAULT 'healthy',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crops_select_farmers_crops" ON crops FOR SELECT USING (
  plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "crops_insert_own_crops" ON crops FOR INSERT WITH CHECK (
  plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "crops_update_own_crops" ON crops FOR UPDATE USING (
  plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()))
);

-- ============================================================================
-- 4. SENSOR READINGS TABLE
-- ============================================================================
CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  sensor_id TEXT,
  reading_type TEXT,
  value FLOAT,
  unit TEXT,
  optimal_range TEXT,
  status TEXT,
  recorded_at TIMESTAMP,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sensor_readings_crop ON sensor_readings(crop_id);
CREATE INDEX idx_sensor_readings_recorded_at ON sensor_readings(recorded_at);

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sensor_readings_select" ON sensor_readings FOR SELECT USING (
  crop_id IN (SELECT id FROM crops WHERE plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())))
);

-- ============================================================================
-- 5. CROP HEALTH DAILY TABLE (Aggregated metrics)
-- ============================================================================
CREATE TABLE crop_health_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  health_score INT,
  moisture_pct FLOAT,
  disease_risk_pct FLOAT,
  nitrogen_level FLOAT,
  canopy_cover_pct FLOAT,
  organic_carbon FLOAT,
  soil_ph FLOAT,
  soil_ec FLOAT,
  canopy_temperature FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(crop_id, date)
);

CREATE INDEX idx_crop_health_daily_crop ON crop_health_daily(crop_id);
CREATE INDEX idx_crop_health_daily_date ON crop_health_daily(date);

ALTER TABLE crop_health_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crop_health_daily_select" ON crop_health_daily FOR SELECT USING (
  crop_id IN (SELECT id FROM crops WHERE plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())))
);

-- ============================================================================
-- 6. RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  type TEXT,
  priority TEXT,
  title TEXT NOT NULL,
  body TEXT,
  why_now TEXT,
  predicted_revenue_impact FLOAT,
  actions JSONB,
  frequency TEXT,
  deadline_date DATE,
  status TEXT DEFAULT 'pending',
  action_taken_date DATE,
  actual_revenue_impact FLOAT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recommendations_farmer ON recommendations(farmer_id);
CREATE INDEX idx_recommendations_crop ON recommendations(crop_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations_select" ON recommendations FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "recommendations_update" ON recommendations FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 7. ALERTS / NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES crops(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  alert_type TEXT,
  severity TEXT,
  title TEXT NOT NULL,
  description TEXT,
  affected_area TEXT,
  risk_level TEXT,
  action_deadline DATE,
  recommended_action TEXT,
  estimated_cost FLOAT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_alerts_farmer ON alerts(farmer_id);
CREATE INDEX idx_alerts_status ON alerts(status);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select" ON alerts FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 8. PRODUCE GRADES TABLE
-- ============================================================================
CREATE TABLE produce_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  batch_number TEXT,
  grade TEXT,
  quality_score INT,
  grain_size_uniformity_score INT,
  color_ripeness_score INT,
  surface_quality_score INT,
  moisture_estimate FLOAT,
  quantity FLOAT,
  market_price_per_unit FLOAT,
  batch_revenue FLOAT,
  graded_date DATE,
  graded_by TEXT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_produce_grades_crop ON produce_grades(crop_id);
CREATE INDEX idx_produce_grades_date ON produce_grades(graded_date);

ALTER TABLE produce_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produce_grades_select" ON produce_grades FOR SELECT USING (
  crop_id IN (SELECT id FROM crops WHERE plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())))
);

-- ============================================================================
-- 9. GOVERNMENT SCHEMES TABLE (Static/seeded)
-- ============================================================================
CREATE TABLE government_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_name TEXT NOT NULL UNIQUE,
  provider TEXT,
  category TEXT,
  description TEXT,
  benefit_description TEXT,
  benefit_amount FLOAT,
  eligibility_criteria JSONB,
  required_documents JSONB,
  application_deadline DATE,
  state_specific TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE government_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "government_schemes_select" ON government_schemes FOR SELECT USING (is_active = true);

-- ============================================================================
-- 10. FARMER SCHEME APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE farmer_scheme_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  scheme_id UUID NOT NULL REFERENCES government_schemes(id) ON DELETE CASCADE,
  application_status TEXT DEFAULT 'eligible',
  estimated_benefit FLOAT,
  actual_benefit FLOAT,
  documents_submitted JSONB,
  application_date DATE,
  approval_date DATE,
  disbursement_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(farmer_id, scheme_id)
);

CREATE INDEX idx_farmer_scheme_applications_farmer ON farmer_scheme_applications(farmer_id);

ALTER TABLE farmer_scheme_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmer_scheme_applications_select" ON farmer_scheme_applications FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "farmer_scheme_applications_update" ON farmer_scheme_applications FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 11. SEASONS TABLE
-- ============================================================================
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  season_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  crop_id UUID REFERENCES crops(id),
  plot_id UUID REFERENCES plots(id),
  total_revenue_added FLOAT DEFAULT 0,
  recommendations_followed INT DEFAULT 0,
  recommendations_skipped INT DEFAULT 0,
  recommendations_partial INT DEFAULT 0,
  average_produce_grade TEXT,
  estimated_yield_impact FLOAT,
  schemes_applied INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE INDEX idx_seasons_farmer ON seasons(farmer_id);
CREATE INDEX idx_seasons_is_active ON seasons(is_active);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_select" ON seasons FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 12. SEASON REVIEWS / INSIGHTS TABLE
-- ============================================================================
CREATE TABLE season_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  review_type TEXT,
  title TEXT NOT NULL,
  body TEXT,
  insight_date DATE,
  revenue_impact FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE season_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_reviews_select" ON season_reviews FOR SELECT USING (
  season_id IN (SELECT id FROM seasons WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()))
);

-- ============================================================================
-- 13. WEATHER FORECAST TABLE
-- ============================================================================
CREATE TABLE weather_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  forecast_date DATE,
  weather_icon TEXT,
  temp_min FLOAT,
  temp_max FLOAT,
  rainfall_mm FLOAT,
  humidity_pct FLOAT,
  wind_speed_kmh FLOAT,
  forecast_generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_weather_forecast_plot ON weather_forecast(plot_id);
CREATE INDEX idx_weather_forecast_date ON weather_forecast(forecast_date);

ALTER TABLE weather_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weather_forecast_select" ON weather_forecast FOR SELECT USING (
  plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid()))
);

-- ============================================================================
-- 14. ACTIVITY LOG / TIMELINE TABLE
-- ============================================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
  event_type TEXT,
  event_title TEXT,
  event_description TEXT,
  status TEXT,
  impact_revenue FLOAT,
  event_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_log_farmer ON activity_log(farmer_id);
CREATE INDEX idx_activity_log_event_date ON activity_log(event_date);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 15. MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  message_type TEXT,
  title TEXT NOT NULL,
  body TEXT,
  channel TEXT,
  is_read BOOLEAN DEFAULT false,
  related_crop_id UUID REFERENCES crops(id),
  related_recommendation_id UUID REFERENCES recommendations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX idx_messages_farmer ON messages(farmer_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 16. FIELD SCANS TABLE (Disease detection, nutrient status)
-- ============================================================================
CREATE TABLE field_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  scan_type TEXT,
  image_url TEXT,
  analysis_result JSONB,
  ml_model_used TEXT,
  frame_quality_pct FLOAT,
  scanned_date DATE,
  analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_field_scans_crop ON field_scans(crop_id);

ALTER TABLE field_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_scans_select" ON field_scans FOR SELECT USING (
  crop_id IN (SELECT id FROM crops WHERE plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())))
);

-- ============================================================================
-- 17. FERTILIZER APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE fertilizer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  fertilizer_type TEXT,
  dose_per_acre FLOAT,
  total_dose FLOAT,
  unit TEXT,
  application_date DATE,
  expected_yield_impact FLOAT,
  actual_yield_impact FLOAT,
  cost FLOAT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fertilizer_applications_crop ON fertilizer_applications(crop_id);

ALTER TABLE fertilizer_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fertilizer_applications_select" ON fertilizer_applications FOR SELECT USING (
  crop_id IN (SELECT id FROM crops WHERE plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())))
);

-- ============================================================================
-- 18. HARVEST PLANNING TABLE
-- ============================================================================
CREATE TABLE harvest_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  recommended_harvest_start_date DATE,
  recommended_harvest_end_date DATE,
  window_score INT,
  maturity_score INT,
  weather_safety_score INT,
  price_trend_score INT,
  expected_price_per_unit FLOAT,
  expected_total_revenue FLOAT,
  risk_if_delayed FLOAT,
  harvest_date DATE,
  actual_revenue FLOAT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_harvest_plans_crop ON harvest_plans(crop_id);

ALTER TABLE harvest_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "harvest_plans_select" ON harvest_plans FOR SELECT USING (
  crop_id IN (SELECT id FROM crops WHERE plot_id IN (SELECT id FROM plots WHERE farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())))
);

-- ============================================================================
-- 19. USER SETTINGS TABLE
-- ============================================================================
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL UNIQUE REFERENCES farmers(id) ON DELETE CASCADE,
  preferred_language TEXT DEFAULT 'English',
  notification_enabled BOOLEAN DEFAULT true,
  notification_channel TEXT DEFAULT 'in-app',
  daily_digest_enabled BOOLEAN DEFAULT true,
  alert_threshold_settings JSONB,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- 20. SYNC LOG TABLE (Offline sync tracking)
-- ============================================================================
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  action TEXT,
  table_name TEXT,
  record_id UUID,
  synced_from TIMESTAMP,
  synced_to TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_log_farmer ON sync_log(farmer_id);
CREATE INDEX idx_sync_log_status ON sync_log(status);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_log_select" ON sync_log FOR SELECT USING (
  farmer_id IN (SELECT id FROM farmers WHERE auth_user_id = auth.uid())
);

-- ============================================================================
-- SEED DATA: Government Schemes
-- ============================================================================
INSERT INTO government_schemes (scheme_name, provider, category, description, benefit_description, benefit_amount, eligibility_criteria, required_documents, application_deadline, state_specific, is_active)
VALUES
(
  'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
  'Government of India',
  'insurance',
  'Comprehensive crop insurance scheme to protect farmers from crop losses due to natural calamities.',
  'Coverage up to 75% of loss. Premium subsidy: 2% (kharif), 1.5% (rabi), 5% (horticulture).',
  5000,
  '["Farmer with valid land records", "Crop grown in notified area", "No default in previous loans"]'::jsonb,
  '[{"doc": "Land ownership proof", "required": true}, {"doc": "Crop sowing certificate", "required": true}, {"doc": "Bank account details", "required": true}]'::jsonb,
  '2026-09-30',
  'Maharashtra,Karnataka,Andhra Pradesh,Tamil Nadu',
  true
),
(
  'PM-KISAN',
  'Government of India',
  'income-support',
  'Direct income support scheme providing ₹6,000 per year to eligible farmers.',
  '₹6,000 per year in three installments of ₹2,000 each.',
  6000,
  '["Farmer with land holding", "Engaged in agriculture", "Compliant with tax norms"]'::jsonb,
  '[{"doc": "Aadhar Card", "required": true}, {"doc": "Land records", "required": true}, {"doc": "Bank account proof", "required": true}]'::jsonb,
  '2026-12-31',
  'All States',
  true
),
(
  'Kisan Credit Card (KCC)',
  'Commercial & Cooperative Banks',
  'credit',
  'Short-term credit scheme for agricultural purposes at concessional rates.',
  'Loans up to ₹3 lakh at 4% interest (central subsidy). Rate: 7-8% per annum.',
  300000,
  '["Farmer with agricultural activity", "No overdue in previous loans"]'::jsonb,
  '[{"doc": "Land records", "required": true}, {"doc": "Photo ID", "required": true}, {"doc": "Bank account", "required": true}]'::jsonb,
  '2026-11-30',
  'All States',
  true
),
(
  'e-NAM (National Agriculture Market)',
  'National Spot Exchange Limited',
  'marketplace',
  'Online commodity market platform for transparent agricultural trade.',
  'Direct market access, competitive pricing, reduced intermediaries.',
  0,
  '["Farmer or producer group", "Agricultural commodities"]'::jsonb,
  '[{"doc": "Farmer registration", "required": true}, {"doc": "Commodity details", "required": false}]'::jsonb,
  '2026-12-31',
  'All States',
  true
),
(
  'Soil Health Card Scheme',
  'Ministry of Agriculture',
  'subsidy',
  'Free soil testing and nutrient management guidance for farmers.',
  'Soil test report, nutrient recommendations, fertilizer subsidy eligibility.',
  5000,
  '["Farmer with cultivable land", "No soil test in past 3 years"]'::jsonb,
  '[{"doc": "Land records", "required": true}, {"doc": "Photo ID", "required": true}]'::jsonb,
  '2026-06-30',
  'All States',
  true
);

-- ============================================================================
-- Create updatable view for easier data access
-- ============================================================================
CREATE VIEW farmer_crop_overview AS
SELECT
  f.id as farmer_id,
  f.name as farmer_name,
  c.id as crop_id,
  c.crop_name,
  c.variety,
  c.current_stage,
  c.health_status,
  p.name as plot_name,
  p.area_acres,
  chd.health_score,
  chd.moisture_pct,
  chd.disease_risk_pct,
  chd.date as last_health_update
FROM farmers f
LEFT JOIN plots p ON f.id = p.farmer_id
LEFT JOIN crops c ON p.id = c.plot_id
LEFT JOIN crop_health_daily chd ON c.id = chd.crop_id AND chd.date = CURRENT_DATE;

ALTER VIEW farmer_crop_overview OWNER TO postgres;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Auto-create user settings when farmer is created
CREATE OR REPLACE FUNCTION create_user_settings_on_farmer_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (farmer_id, preferred_language)
  VALUES (NEW.id, NEW.preferred_language);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_settings
AFTER INSERT ON farmers
FOR EACH ROW
EXECUTE FUNCTION create_user_settings_on_farmer_creation();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to tables
CREATE TRIGGER trigger_update_farmers_timestamp BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_plots_timestamp BEFORE UPDATE ON plots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_crops_timestamp BEFORE UPDATE ON crops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_recommendations_timestamp BEFORE UPDATE ON recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_farmer_scheme_applications_timestamp BEFORE UPDATE ON farmer_scheme_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_seasons_timestamp BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_harvest_plans_timestamp BEFORE UPDATE ON harvest_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_user_settings_timestamp BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Indexes for common queries
-- ============================================================================
CREATE INDEX idx_farmers_auth_user_id ON farmers(auth_user_id);
CREATE INDEX idx_crops_plot_id ON crops(plot_id);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
