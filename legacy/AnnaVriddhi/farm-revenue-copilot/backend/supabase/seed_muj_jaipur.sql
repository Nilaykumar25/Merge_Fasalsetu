-- ============================================================================
-- AnnaVriddhi — MUJ/Jaipur Area Demo Seed (50 km radius of Manipal Univ. Jaipur)
-- ============================================================================
-- Soil values sourced from real SHC (Soil Health Card) data scraped from
-- soilhealth.dac.gov.in for the 50 km radius around MUJ (26.8466°N, 75.5675°E).
--
-- Run AFTER migrations 001 and 002.
--
-- HOW TO USE
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste and run this entire script
--   3. Each farmer's UUID is deterministic via gen_random_uuid() — re-running
--      is safe because every INSERT uses ON CONFLICT DO NOTHING.
--
-- Farmers created here use Supabase Auth bypass (auth_user_id is a fixed UUID).
-- For a real demo login, create an auth user first and replace the UUIDs below.
-- ============================================================================

-- ============================================================================
-- 0. PREREQUISITE CHECK
-- ============================================================================
-- This script assumes the schema (tables: farmers, plots, crops, etc.)
-- already exists. It does NOT re-run migrations.
-- If crop_state column is missing, run migration 002 first:
--   ALTER TABLE crops ADD COLUMN IF NOT EXISTS crop_state TEXT NOT NULL DEFAULT 'active'
--     CHECK (crop_state IN ('active','harvested','failed','archived'));
-- ============================================================================

-- ============================================================================
-- 1. DEMO AUTH USERS
--    Inserts directly into auth.users using only the columns present in every
--    Supabase project. Password for all accounts: "password"
--    (bcrypt: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
-- ============================================================================

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ramesh.sharma@demo.annavriddhi.in',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   false, NOW(), NOW()),

  ('aaaaaaaa-0002-0002-0002-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sunita.meena@demo.annavriddhi.in',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   false, NOW(), NOW()),

  ('aaaaaaaa-0003-0003-0003-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gopal.yadav@demo.annavriddhi.in',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   false, NOW(), NOW()),

  ('aaaaaaaa-0004-0004-0004-000000000004',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'kavita.gurjar@demo.annavriddhi.in',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   false, NOW(), NOW()),

  ('aaaaaaaa-0005-0005-0005-000000000005',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'mohan.bishnoi@demo.annavriddhi.in',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   false, NOW(), NOW())

ON CONFLICT (id) DO NOTHING;

-- auth.identities — required so email/password login works
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001',
   'aaaaaaaa-0001-0001-0001-000000000001',
   'ramesh.sharma@demo.annavriddhi.in', 'email',
   '{"sub":"aaaaaaaa-0001-0001-0001-000000000001","email":"ramesh.sharma@demo.annavriddhi.in"}'::jsonb,
   NOW(), NOW(), NOW()),

  ('aaaaaaaa-0002-0002-0002-000000000002',
   'aaaaaaaa-0002-0002-0002-000000000002',
   'sunita.meena@demo.annavriddhi.in', 'email',
   '{"sub":"aaaaaaaa-0002-0002-0002-000000000002","email":"sunita.meena@demo.annavriddhi.in"}'::jsonb,
   NOW(), NOW(), NOW()),

  ('aaaaaaaa-0003-0003-0003-000000000003',
   'aaaaaaaa-0003-0003-0003-000000000003',
   'gopal.yadav@demo.annavriddhi.in', 'email',
   '{"sub":"aaaaaaaa-0003-0003-0003-000000000003","email":"gopal.yadav@demo.annavriddhi.in"}'::jsonb,
   NOW(), NOW(), NOW()),

  ('aaaaaaaa-0004-0004-0004-000000000004',
   'aaaaaaaa-0004-0004-0004-000000000004',
   'kavita.gurjar@demo.annavriddhi.in', 'email',
   '{"sub":"aaaaaaaa-0004-0004-0004-000000000004","email":"kavita.gurjar@demo.annavriddhi.in"}'::jsonb,
   NOW(), NOW(), NOW()),

  ('aaaaaaaa-0005-0005-0005-000000000005',
   'aaaaaaaa-0005-0005-0005-000000000005',
   'mohan.bishnoi@demo.annavriddhi.in', 'email',
   '{"sub":"aaaaaaaa-0005-0005-0005-000000000005","email":"mohan.bishnoi@demo.annavriddhi.in"}'::jsonb,
   NOW(), NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 2. FARMERS
--    Locations: villages within 1–15 km of MUJ (Dehmi Kalan / Jhotwara area)
--    District: Jaipur, State: Rajasthan
-- ============================================================================

INSERT INTO farmers (id, auth_user_id, name, phone, state, district, village, total_area_acres, preferred_language)
VALUES
  -- Farmer 1 — Ramesh Sharma, near MUJ campus (SHC village 80032, ~1 km)
  ('f1000000-0000-0000-0000-000000000001',
   'aaaaaaaa-0001-0001-0001-000000000001',
   'Ramesh Sharma', '+919876543201', 'Rajasthan', 'Jaipur', 'Dehmi Kalan',
   6.17, 'Hindi'),

  -- Farmer 2 — Sunita Meena, Jhotwara area (~1.1 km from MUJ)
  ('f2000000-0000-0000-0000-000000000002',
   'aaaaaaaa-0002-0002-0002-000000000002',
   'Sunita Meena', '+919876543202', 'Rajasthan', 'Jaipur', 'Jhotwara',
   4.94, 'Hindi'),

  -- Farmer 3 — Gopal Yadav, south of MUJ (~1.25 km)
  ('f3000000-0000-0000-0000-000000000003',
   'aaaaaaaa-0003-0003-0003-000000000003',
   'Gopal Yadav', '+919876543203', 'Rajasthan', 'Jaipur', 'Kartarpura',
   7.41, 'Hindi'),

  -- Farmer 4 — Kavita Gurjar, west of MUJ (~1.32 km)
  ('f4000000-0000-0000-0000-000000000004',
   'aaaaaaaa-0004-0004-0004-000000000004',
   'Kavita Gurjar', '+919876543204', 'Rajasthan', 'Jaipur', 'Murlipura',
   3.70, 'Hindi'),

  -- Farmer 5 — Mohan Bishnoi, south-west of MUJ (~1.34 km)
  ('f5000000-0000-0000-0000-000000000005',
   'aaaaaaaa-0005-0005-0005-000000000005',
   'Mohan Bishnoi', '+919876543205', 'Rajasthan', 'Jaipur', 'Shyam Nagar',
   6.17, 'Hindi')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. PLOTS
--    Coordinates from actual SHC sample locations within 50 km of MUJ.
--    Soil types as reported in the SHC dataset.
-- ============================================================================

INSERT INTO plots (id, farmer_id, name, area_acres, soil_type, location_lat, location_lng)
VALUES
  -- Farmer 1 plots — SHC village 80032, lat=26.845983, lng=75.555137 (~1 km from MUJ)
  ('p1100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
   'Uttar Kheta (North Field)',   2.47, 'Alluvium soil', 26.845983, 75.555137),
  ('p1200000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
   'Dakshin Kheta (South Field)', 3.70, 'Alluvium soil', 26.843852, 75.551560),

  -- Farmer 2 plots — SHC village 80031, lat=26.84707, lng=75.57545 (~1.1 km)
  ('p2100000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002',
   'Purv Kheta (East Field)',     2.47, 'Alluvium soil', 26.847070, 75.575450),
  ('p2200000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002',
   'Paschim Kheta (West Field)',  2.47, 'Sandy Loam',    26.846131, 75.568390),

  -- Farmer 3 plots — SHC village 80032, lat=26.831841, lng=75.563247 (~1.25 km)
  ('p3100000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000003',
   'Mukhya Kheta (Main Field)',   4.94, 'Alluvium soil', 26.831841, 75.563247),
  ('p3200000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000003',
   'Chota Kheta (Small Field)',   2.47, 'Clay Loam',     26.834200, 75.565100),

  -- Farmer 4 plots — SHC village 80032, lat=26.84208, lng=75.55174 (~1.32 km)
  ('p4100000-0000-0000-0000-000000000004', 'f4000000-0000-0000-0000-000000000004',
   'Prabhat Kheta (Morning Field)',2.47, 'Alluvium soil', 26.842080, 75.551740),
  ('p4200000-0000-0000-0000-000000000004', 'f4000000-0000-0000-0000-000000000004',
   'Sandhya Kheta (Evening Field)',1.23, 'Loamy Sand',    26.840500, 75.550200),

  -- Farmer 5 plots — SHC village 80032, lat=26.843852, lng=75.55156 (~1.34 km)
  ('p5100000-0000-0000-0000-000000000005', 'f5000000-0000-0000-0000-000000000005',
   'Badi Zameen (Large Field)',   3.70, 'Alluvium soil', 26.843852, 75.551560),
  ('p5200000-0000-0000-0000-000000000005', 'f5000000-0000-0000-0000-000000000005',
   'Choti Zameen (Small Field)',  2.47, 'Sandy Loam',    26.847654, 75.566237)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. CROPS (with crop_state — requires migration 002)
--    Sep 2026 context: Kharif 2026 season (sown Jun-Jul, harvest Sep-Oct).
--    Rabi 2025-26 crops already harvested.
-- ============================================================================

INSERT INTO crops (id, plot_id, crop_name, variety, planted_date, expected_harvest_date,
                   current_stage, crop_state, health_status)
VALUES
  -- Farmer 1, Plot 1: Bajra (Pearl Millet) — Kharif 2026, active
  ('c1100000-0000-0000-0000-000000000001', 'p1100000-0000-0000-0000-000000000001',
   'Bajra (Pearl Millet)', 'HHB-67 Improved', '2026-06-25', '2026-09-20',
   'Grain filling', 'active', 'healthy'),

  -- Farmer 1, Plot 2: Wheat — Rabi 2025-26, harvested
  ('c1200000-0000-0000-0000-000000000001', 'p1200000-0000-0000-0000-000000000001',
   'Wheat', 'HD-3086', '2025-11-15', '2026-03-20',
   'Post-harvest', 'harvested', 'healthy'),

  -- Farmer 2, Plot 1: Mustard — Rabi 2025-26, harvested
  ('c2100000-0000-0000-0000-000000000002', 'p2100000-0000-0000-0000-000000000002',
   'Mustard', 'RH-749', '2025-10-20', '2026-02-15',
   'Post-harvest', 'harvested', 'healthy'),

  -- Farmer 2, Plot 2: Jowar (Sorghum) — Kharif 2026, active
  ('c2200000-0000-0000-0000-000000000002', 'p2200000-0000-0000-0000-000000000002',
   'Jowar (Sorghum)', 'CSV-15', '2026-07-01', '2026-10-10',
   'Flowering', 'active', 'at-risk'),

  -- Farmer 3, Plot 1: Groundnut — Kharif 2026, active
  ('c3100000-0000-0000-0000-000000000003', 'p3100000-0000-0000-0000-000000000003',
   'Groundnut', 'GG-20', '2026-06-28', '2026-09-30',
   'Pod development', 'active', 'healthy'),

  -- Farmer 3, Plot 2: Barley — Rabi 2025-26, harvested
  ('c3200000-0000-0000-0000-000000000003', 'p3200000-0000-0000-0000-000000000003',
   'Barley', 'RD-2052', '2025-11-10', '2026-03-10',
   'Post-harvest', 'harvested', 'healthy'),

  -- Farmer 4, Plot 1: Cluster Beans (Guar) — Kharif 2026, active, stressed
  ('c4100000-0000-0000-0000-000000000004', 'p4100000-0000-0000-0000-000000000004',
   'Cluster Beans (Guar)', 'RGC-1066', '2026-07-05', '2026-10-05',
   'Vegetative', 'active', 'critical'),

  -- Farmer 4, Plot 2: Mustard — Rabi 2025-26, harvested
  ('c4200000-0000-0000-0000-000000000004', 'p4200000-0000-0000-0000-000000000004',
   'Mustard', 'Pusa Bold', '2025-10-25', '2026-02-20',
   'Post-harvest', 'harvested', 'healthy'),

  -- Farmer 5, Plot 1: Bajra — Kharif 2026, active
  ('c5100000-0000-0000-0000-000000000005', 'p5100000-0000-0000-0000-000000000005',
   'Bajra (Pearl Millet)', 'MPMH-17', '2026-06-22', '2026-09-18',
   'Maturity', 'active', 'healthy'),

  -- Farmer 5, Plot 2: Wheat — Rabi 2025-26, harvested
  ('c5200000-0000-0000-0000-000000000005', 'p5200000-0000-0000-0000-000000000005',
   'Wheat', 'GW-496', '2025-11-20', '2026-03-25',
   'Post-harvest', 'harvested', 'healthy')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. CROP HEALTH DAILY
--    N/P/K/EC/OC values sourced directly from the SHC data for each plot's
--    GPS coordinates. These reflect actual soil conditions at those locations.
--
--    SHC Source mapping:
--      Farmer 1 Plot 1 (26.845983,75.555137): SHC RJ/2021-22/145706946/1
--        pH=7.6, EC=0.33, OC=0.21, P=26, K=266, Zn=3.9 (Sufficient)
--      Farmer 2 Plot 2 (26.846131,75.56839):  SHC RJ/2018-19/141669448/1
--        pH=8.52, EC=0.35, OC=0.25, P=26.26, K=627, Cu=Deficient
--      Farmer 3 Plot 1 (26.831841,75.563247): SHC RJ/2021-22/145707335/1
--        pH=7.8, EC=0.11, OC=0.30, P=40, K=264, Zn=Deficient
--      Farmer 4 Plot 1 (26.84208,75.55174):   SHC RJ/2021-22/146500655/1
--        pH=7.9, EC=0.42, OC=0.16, P=36, K=288, Zn=Deficient, Fe=Deficient
--      Farmer 5 Plot 1 (26.843852,75.55156):  SHC RJ/2021-22/145707338/1
--        pH=7.5, EC=0.22, OC=0.30, P=26, K=380
--
--    N column is blank in SHC data for most Rajasthan samples (not tested).
--    We derive an estimated nitrogen proxy from OC × 20 (rough Walkley-Black
--    conversion) for use in recommendations. Stored in nitrogen_level.
-- ============================================================================

-- Farmer 1, Plot 1 — Bajra (active crop), 7-day window ending today (Sep 11 2026)
INSERT INTO crop_health_daily
  (crop_id, date, health_score, moisture_pct, disease_risk_pct,
   nitrogen_level, canopy_cover_pct, organic_carbon, soil_ph, soil_ec, canopy_temperature)
VALUES
  ('c1100000-0000-0000-0000-000000000001', '2026-09-05', 81, 48.2, 10, 42, 68, 0.21, 7.6, 0.33, 29.5),
  ('c1100000-0000-0000-0000-000000000001', '2026-09-06', 82, 50.1, 9,  42, 70, 0.21, 7.6, 0.32, 28.8),
  ('c1100000-0000-0000-0000-000000000001', '2026-09-07', 80, 47.8, 11, 42, 68, 0.21, 7.6, 0.33, 30.1),
  ('c1100000-0000-0000-0000-000000000001', '2026-09-08', 79, 45.5, 13, 42, 66, 0.21, 7.7, 0.34, 31.2),
  ('c1100000-0000-0000-0000-000000000001', '2026-09-09', 78, 44.0, 14, 42, 65, 0.21, 7.7, 0.34, 31.8),
  ('c1100000-0000-0000-0000-000000000001', '2026-09-10', 77, 43.2, 15, 42, 64, 0.21, 7.7, 0.35, 32.3),
  ('c1100000-0000-0000-0000-000000000001', '2026-09-11', 76, 42.0, 16, 42, 63, 0.21, 7.7, 0.35, 32.8)
ON CONFLICT (crop_id, date) DO NOTHING;

-- Farmer 2, Plot 2 — Jowar (active, at-risk), high pH alkaline soil
INSERT INTO crop_health_daily
  (crop_id, date, health_score, moisture_pct, disease_risk_pct,
   nitrogen_level, canopy_cover_pct, organic_carbon, soil_ph, soil_ec, canopy_temperature)
VALUES
  ('c2200000-0000-0000-0000-000000000002', '2026-09-05', 62, 55.2, 38, 50, 55, 0.25, 8.52, 0.35, 33.2),
  ('c2200000-0000-0000-0000-000000000002', '2026-09-06', 60, 53.1, 41, 50, 53, 0.25, 8.52, 0.36, 34.0),
  ('c2200000-0000-0000-0000-000000000002', '2026-09-07', 58, 51.0, 43, 50, 51, 0.25, 8.52, 0.36, 34.8),
  ('c2200000-0000-0000-0000-000000000002', '2026-09-08', 56, 49.2, 46, 50, 50, 0.25, 8.53, 0.37, 35.5),
  ('c2200000-0000-0000-0000-000000000002', '2026-09-09', 55, 48.0, 48, 50, 49, 0.25, 8.53, 0.37, 36.0),
  ('c2200000-0000-0000-0000-000000000002', '2026-09-10', 53, 47.2, 51, 50, 48, 0.25, 8.53, 0.38, 36.5),
  ('c2200000-0000-0000-0000-000000000002', '2026-09-11', 52, 46.5, 53, 50, 47, 0.25, 8.53, 0.38, 37.0)
ON CONFLICT (crop_id, date) DO NOTHING;

-- Farmer 3, Plot 1 — Groundnut (active), Zn-deficient soil
INSERT INTO crop_health_daily
  (crop_id, date, health_score, moisture_pct, disease_risk_pct,
   nitrogen_level, canopy_cover_pct, organic_carbon, soil_ph, soil_ec, canopy_temperature)
VALUES
  ('c3100000-0000-0000-0000-000000000003', '2026-09-05', 74, 52.0, 20, 60, 72, 0.30, 7.8, 0.11, 30.5),
  ('c3100000-0000-0000-0000-000000000003', '2026-09-06', 76, 54.2, 18, 60, 74, 0.30, 7.8, 0.11, 29.8),
  ('c3100000-0000-0000-0000-000000000003', '2026-09-07', 75, 53.0, 19, 60, 73, 0.30, 7.8, 0.12, 30.2),
  ('c3100000-0000-0000-0000-000000000003', '2026-09-08', 73, 51.5, 21, 60, 71, 0.30, 7.9, 0.12, 30.8),
  ('c3100000-0000-0000-0000-000000000003', '2026-09-09', 71, 50.0, 23, 60, 70, 0.30, 7.9, 0.12, 31.4),
  ('c3100000-0000-0000-0000-000000000003', '2026-09-10', 70, 49.2, 24, 60, 69, 0.30, 7.9, 0.13, 31.9),
  ('c3100000-0000-0000-0000-000000000003', '2026-09-11', 69, 48.5, 25, 60, 68, 0.30, 7.9, 0.13, 32.3)
ON CONFLICT (crop_id, date) DO NOTHING;

-- Farmer 4, Plot 1 — Guar (critical), both Zn and Fe deficient, higher EC
INSERT INTO crop_health_daily
  (crop_id, date, health_score, moisture_pct, disease_risk_pct,
   nitrogen_level, canopy_cover_pct, organic_carbon, soil_ph, soil_ec, canopy_temperature)
VALUES
  ('c4100000-0000-0000-0000-000000000004', '2026-09-05', 42, 35.5, 62, 32, 30, 0.16, 7.9, 0.42, 38.5),
  ('c4100000-0000-0000-0000-000000000004', '2026-09-06', 40, 33.2, 65, 32, 28, 0.16, 7.9, 0.43, 39.2),
  ('c4100000-0000-0000-0000-000000000004', '2026-09-07', 38, 31.0, 68, 32, 26, 0.16, 8.0, 0.43, 40.0),
  ('c4100000-0000-0000-0000-000000000004', '2026-09-08', 36, 29.5, 71, 32, 24, 0.16, 8.0, 0.44, 40.8),
  ('c4100000-0000-0000-0000-000000000004', '2026-09-09', 35, 28.2, 73, 32, 23, 0.16, 8.0, 0.44, 41.3),
  ('c4100000-0000-0000-0000-000000000004', '2026-09-10', 33, 27.0, 75, 32, 22, 0.16, 8.1, 0.45, 41.8),
  ('c4100000-0000-0000-0000-000000000004', '2026-09-11', 32, 26.5, 77, 32, 21, 0.16, 8.1, 0.45, 42.2)
ON CONFLICT (crop_id, date) DO NOTHING;

-- Farmer 5, Plot 1 — Bajra (near maturity, healthy), K-high soil
INSERT INTO crop_health_daily
  (crop_id, date, health_score, moisture_pct, disease_risk_pct,
   nitrogen_level, canopy_cover_pct, organic_carbon, soil_ph, soil_ec, canopy_temperature)
VALUES
  ('c5100000-0000-0000-0000-000000000005', '2026-09-05', 88, 46.0, 7, 60, 80, 0.30, 7.5, 0.22, 28.2),
  ('c5100000-0000-0000-0000-000000000005', '2026-09-06', 88, 47.2, 6, 60, 81, 0.30, 7.5, 0.22, 27.8),
  ('c5100000-0000-0000-0000-000000000005', '2026-09-07', 87, 46.8, 7, 60, 80, 0.30, 7.5, 0.22, 28.5),
  ('c5100000-0000-0000-0000-000000000005', '2026-09-08', 86, 45.5, 8, 60, 79, 0.30, 7.6, 0.23, 29.0),
  ('c5100000-0000-0000-0000-000000000005', '2026-09-09', 85, 44.8, 9, 60, 78, 0.30, 7.6, 0.23, 29.5),
  ('c5100000-0000-0000-0000-000000000005', '2026-09-10', 85, 44.2, 9, 60, 78, 0.30, 7.6, 0.23, 29.8),
  ('c5100000-0000-0000-0000-000000000005', '2026-09-11', 84, 43.5, 10, 60, 77, 0.30, 7.6, 0.23, 30.2)
ON CONFLICT (crop_id, date) DO NOTHING;

-- ============================================================================
-- 6. RECOMMENDATIONS
--    Generated from actual SHC soil deficiencies and current crop stages.
-- ============================================================================

INSERT INTO recommendations
  (crop_id, farmer_id, type, priority, title, body, why_now,
   predicted_revenue_impact, frequency, deadline_date, status)
VALUES
  -- Farmer 1 Bajra: OC low (0.21%), top-dress N before grain fill completes
  ('c1100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
   'fertilizer', 'high',
   'Apply top-dress urea now — grain fill window closing',
   'Your plot soil has Very Low OC (0.21%). Apply 70 kg/ha urea immediately. '
   'SHC recommends 70 kg/ha urea + 75 kg/ha SSP + 15 kg/ha MOP for Bajra on your soil.',
   'Crop is at grain-filling stage. Nitrogen demand peaks now. Delay will cut grain weight.',
   3200, 'Once this season', '2026-09-14', 'pending'),

  -- Farmer 2 Jowar: very high pH (8.52), gypsum + micronutrient
  ('c2200000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002',
   'fertilizer', 'high',
   'Apply gypsum to correct strongly alkaline soil (pH 8.52)',
   'SHC recommends Gypsum @ 5–10 t/ha for your plot. Also apply Copper Sulphate '
   '(10.42 kg/ha) — Cu is Deficient per SHC card RJ/2018-19/141669448.',
   'Flowering stage. Alkalinity is locking out micronutrients causing chlorosis.',
   2800, 'Once per season', '2026-09-16', 'pending'),

  -- Farmer 2 Jowar: disease risk trending up (53%)
  ('c2200000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002',
   'pest-management', 'high',
   'Sorghum shoot fly — scout and apply neem-based spray',
   'Disease risk index at 53% and climbing. High humidity at flowering stage '
   'creates conditions for shoot fly. Inspect 5 plants per 10m row.',
   'Early intervention saves 20-30% yield. Window: 5 days.',
   1800, 'Twice this week', '2026-09-13', 'pending'),

  -- Farmer 3 Groundnut: Zinc deficient
  ('c3100000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000003',
   'fertilizer', 'medium',
   'Apply zinc sulphate — Zn Deficient per SHC',
   'SHC card for your plot shows Zn = 0.44 ppm (Deficient, threshold 0.6 ppm). '
   'Apply Zinc Sulphate @ 19.04 kg/ha through soil. Groundnut pod-filling is highly Zn-sensitive.',
   'Pod development stage — Zn deficiency now will reduce pod set and oil content.',
   2400, 'Once this season', '2026-09-18', 'pending'),

  -- Farmer 4 Guar: critical — Zn + Fe deficient, very low OC, moisture crisis
  ('c4100000-0000-0000-0000-000000000004', 'f4000000-0000-0000-0000-000000000004',
   'irrigation', 'critical',
   'Emergency irrigation — moisture at 26.5%, crop stress critical',
   'Soil moisture has dropped to 26.5% against optimal 40-55% for Guar at vegetative '
   'stage. Irrigate within 24 hours — at least 40 mm of water.',
   'Crop health score is 32/100 and declining daily. Without water the crop will fail.',
   4000, 'Every 4 days', '2026-09-12', 'pending'),

  ('c4100000-0000-0000-0000-000000000004', 'f4000000-0000-0000-0000-000000000004',
   'fertilizer', 'high',
   'Correct Zn + Fe deficiency — both flagged by SHC',
   'SHC for plot (26.842°N, 75.552°E): Zn = 0.32 ppm (Deficient), Fe = 4.42 ppm (Deficient). '
   'Apply Zinc Sulphate 21% @ 9.52 kg/ha + Ferrous Sulphate 19.5% @ 10.26 kg/ha.',
   'Dual micronutrient deficiency at vegetative stage compounds the moisture stress.',
   2200, 'Once this season', '2026-09-15', 'pending'),

  -- Farmer 5 Bajra: near maturity, plan harvest
  ('c5100000-0000-0000-0000-000000000005', 'f5000000-0000-0000-0000-000000000005',
   'harvest', 'medium',
   'Harvest window opens in 7–10 days — arrange logistics now',
   'Bajra is at maturity stage. Grain moisture ~18–20% now; target <15% at harvest. '
   'Expected harvest: Sep 18–22. Arrange thresher booking and storage bags.',
   'Post-maturity delay increases shattering loss. Market prices peak early Oct.',
   5500, 'Once', '2026-09-18', 'pending')

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. ALERTS
-- ============================================================================

INSERT INTO alerts
  (crop_id, farmer_id, alert_type, severity, title, description,
   affected_area, risk_level, action_deadline, recommended_action,
   estimated_cost, status)
VALUES
  -- Farmer 4 Guar: critical moisture
  ('c4100000-0000-0000-0000-000000000004', 'f4000000-0000-0000-0000-000000000004',
   'moisture', 'urgent',
   'Critical: Soil moisture 26.5% — crop failure imminent',
   'Soil moisture for Guar plot has declined to 26.5% over 7 days (was 35.5%). '
   'Without irrigation within 24 hours, significant yield loss is unavoidable.',
   '2.47 acres (Prabhat Kheta)', 'Critical',
   '2026-09-12',
   'Irrigate immediately. Run drip or flood irrigation for 3–4 hours.',
   600, 'active'),

  -- Farmer 4 Guar: micronutrient deficiency
  ('c4100000-0000-0000-0000-000000000004', 'f4000000-0000-0000-0000-000000000004',
   'nutrient', 'warning',
   'Dual micronutrient deficiency: Zinc and Iron',
   'SHC data for your field confirms Zn = 0.32 ppm (Deficient) and Fe = 4.42 ppm (Deficient). '
   'Chlorosis visible in younger leaves is caused by this deficiency.',
   '2.47 acres (Prabhat Kheta)', 'High',
   '2026-09-15',
   'Apply Zinc Sulphate + Ferrous Sulphate as per SHC recommendation.',
   1200, 'active'),

  -- Farmer 2 Jowar: disease risk
  ('c2200000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002',
   'disease', 'warning',
   'Shoot fly risk elevated — Jowar at flowering',
   'Disease risk index has risen to 53% over the past 3 days. '
   'Conditions (high humidity + warm nights) are ideal for shoot fly.',
   '2.47 acres (Paschim Kheta)', 'High',
   '2026-09-13',
   'Scout at dawn. Spray neem-based insecticide if >3% damage observed.',
   400, 'active'),

  -- Farmer 1 Bajra: OC low reminder
  ('c1100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
   'nutrient', 'info',
   'Low Organic Carbon — urea top-dressing due',
   'SHC shows OC at 0.21% (Very Low). Timely urea application before grain fill completes '
   'will improve grain weight and protein content.',
   '2.47 acres (Uttar Kheta)', 'Medium',
   '2026-09-14',
   'Apply 70 kg/ha urea. Water the field within 2 days of application.',
   800, 'active')

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SEASONS
-- ============================================================================

INSERT INTO seasons
  (id, farmer_id, season_name, start_date, end_date, crop_id, plot_id,
   total_revenue_added, recommendations_followed, recommendations_skipped,
   average_produce_grade, is_active)
VALUES
  -- Farmer 1: current Kharif 2026
  ('s1100000-0000-0000-0000-000000000001',
   'f1000000-0000-0000-0000-000000000001',
   'Kharif 2026', '2026-06-01', NULL,
   'c1100000-0000-0000-0000-000000000001', 'p1100000-0000-0000-0000-000000000001',
   0, 0, 0, NULL, true),

  -- Farmer 2: current Kharif 2026
  ('s2200000-0000-0000-0000-000000000002',
   'f2000000-0000-0000-0000-000000000002',
   'Kharif 2026', '2026-06-01', NULL,
   'c2200000-0000-0000-0000-000000000002', 'p2200000-0000-0000-0000-000000000002',
   0, 0, 0, NULL, true),

  -- Farmer 3: Rabi 2025-26 completed
  ('s3100000-0000-0000-0000-000000000003',
   'f3000000-0000-0000-0000-000000000003',
   'Rabi 2025-26', '2025-10-01', '2026-04-30',
   'c3200000-0000-0000-0000-000000000003', 'p3200000-0000-0000-0000-000000000003',
   52000, 3, 1, 'B', false),

  -- Farmer 5: current Kharif 2026
  ('s5100000-0000-0000-0000-000000000005',
   'f5000000-0000-0000-0000-000000000005',
   'Kharif 2026', '2026-06-01', NULL,
   'c5100000-0000-0000-0000-000000000005', 'p5100000-0000-0000-0000-000000000005',
   0, 1, 0, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. WEATHER FORECAST (7-day, Jaipur Sep 2026 — monsoon tail-end)
-- ============================================================================

INSERT INTO weather_forecast
  (plot_id, forecast_date, weather_icon, temp_min, temp_max,
   rainfall_mm, humidity_pct, wind_speed_kmh, forecast_generated_at)
VALUES
  -- Farmer 1 North Field (Bajra, grain fill — needs dry spell)
  ('p1100000-0000-0000-0000-000000000001', '2026-09-11', '⛅', 26, 36, 2,  72, 14, NOW()),
  ('p1100000-0000-0000-0000-000000000001', '2026-09-12', '☁️', 25, 34, 8,  80, 18, NOW()),
  ('p1100000-0000-0000-0000-000000000001', '2026-09-13', '🌧️', 24, 32, 22, 88, 20, NOW()),
  ('p1100000-0000-0000-0000-000000000001', '2026-09-14', '🌧️', 24, 31, 18, 86, 16, NOW()),
  ('p1100000-0000-0000-0000-000000000001', '2026-09-15', '⛅', 25, 33, 4,  75, 12, NOW()),
  ('p1100000-0000-0000-0000-000000000001', '2026-09-16', '☀️', 27, 36, 0,  65, 10, NOW()),
  ('p1100000-0000-0000-0000-000000000001', '2026-09-17', '☀️', 28, 37, 0,  60,  8, NOW()),

  -- Farmer 4 critical field (needs rain urgently)
  ('p4100000-0000-0000-0000-000000000004', '2026-09-11', '⛅', 27, 38, 1,  58, 16, NOW()),
  ('p4100000-0000-0000-0000-000000000004', '2026-09-12', '☁️', 26, 36, 5,  65, 18, NOW()),
  ('p4100000-0000-0000-0000-000000000004', '2026-09-13', '🌧️', 25, 33, 15, 82, 20, NOW()),
  ('p4100000-0000-0000-0000-000000000004', '2026-09-14', '⛅', 26, 35, 3,  70, 14, NOW()),
  ('p4100000-0000-0000-0000-000000000004', '2026-09-15', '☀️', 28, 38, 0,  55, 10, NOW()),
  ('p4100000-0000-0000-0000-000000000004', '2026-09-16', '☀️', 29, 39, 0,  50,  8, NOW()),
  ('p4100000-0000-0000-0000-000000000004', '2026-09-17', '☀️', 30, 40, 0,  45,  6, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. GOVERNMENT SCHEME APPLICATIONS (link Rajasthan-relevant schemes)
-- ============================================================================

INSERT INTO farmer_scheme_applications
  (farmer_id, scheme_id, application_status, estimated_benefit)
SELECT 'f1000000-0000-0000-0000-000000000001', id, 'eligible', 6000
FROM government_schemes WHERE scheme_name = 'PM-KISAN'
ON CONFLICT DO NOTHING;

INSERT INTO farmer_scheme_applications
  (farmer_id, scheme_id, application_status, estimated_benefit)
SELECT 'f1000000-0000-0000-0000-000000000001', id, 'applied', 5000
FROM government_schemes WHERE scheme_name = 'Soil Health Card Scheme'
ON CONFLICT DO NOTHING;

INSERT INTO farmer_scheme_applications
  (farmer_id, scheme_id, application_status, estimated_benefit)
SELECT 'f2000000-0000-0000-0000-000000000002', id, 'eligible', 6000
FROM government_schemes WHERE scheme_name = 'PM-KISAN'
ON CONFLICT DO NOTHING;

INSERT INTO farmer_scheme_applications
  (farmer_id, scheme_id, application_status, estimated_benefit)
SELECT 'f4000000-0000-0000-0000-000000000004', id, 'eligible', 5000
FROM government_schemes WHERE scheme_name = 'Pradhan Mantri Fasal Bima Yojana (PMFBY)'
ON CONFLICT DO NOTHING;

INSERT INTO farmer_scheme_applications
  (farmer_id, scheme_id, application_status, estimated_benefit)
SELECT 'f5000000-0000-0000-0000-000000000005', id, 'approved', 6000
FROM government_schemes WHERE scheme_name = 'PM-KISAN'
ON CONFLICT DO NOTHING;

INSERT INTO farmer_scheme_applications
  (farmer_id, scheme_id, application_status, estimated_benefit, actual_benefit)
SELECT 'f5000000-0000-0000-0000-000000000005', id, 'disbursed', 6000, 6000
FROM government_schemes WHERE scheme_name = 'Kisan Credit Card (KCC)'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. MESSAGES (in-app notifications)
-- ============================================================================

INSERT INTO messages (farmer_id, message_type, title, body, channel, is_read, created_at)
VALUES
  ('f4000000-0000-0000-0000-000000000004',
   'alert', 'Ek dam zaroori: Fasal sukh rahi hai',
   'Aapke Guar ke khet mein pani bahut kam ho gaya hai (26.5%). Aaj hi sinchai karein.',
   'in-app', false, NOW() - INTERVAL '30 minutes'),

  ('f4000000-0000-0000-0000-000000000004',
   'recommendation', 'Zinc aur Iron ki kami mili hai',
   'SHC report ke anusar aapki zameen mein Zinc aur Iron ki kami hai. Zinc Sulphate lagaein.',
   'in-app', false, NOW() - INTERVAL '2 hours'),

  ('f2000000-0000-0000-0000-000000000002',
   'alert', 'Jowar mein bimari ka khatra badh raha hai',
   'Bimari ka index 53% ho gaya hai. Subah 5 ped check karein aur zaroorat padne par spray karein.',
   'in-app', false, NOW() - INTERVAL '3 hours'),

  ('f1000000-0000-0000-0000-000000000001',
   'recommendation', 'Abhi urea daalein — Bajra ka grain fill chal raha hai',
   'Aapke khet mein Organic Carbon bahut kam hai (0.21%). 70 kg/ha urea daalein.',
   'in-app', false, NOW() - INTERVAL '4 hours'),

  ('f5000000-0000-0000-0000-000000000005',
   'recommendation', 'Bajra ki katai tayaar — 7-10 din mein',
   'Aapka Bajra pakav ke stage par hai. Sep 18-22 ke beech katai karein.',
   'in-app', false, NOW() - INTERVAL '1 hour'),

  ('f5000000-0000-0000-0000-000000000005',
   'scheme', 'PM-KISAN: ₹2,000 ki kist approve hui',
   'Aapke PM-KISAN khate mein ₹2,000 ki kist jama ho gayi hai.',
   'in-app', true, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. PRODUCE GRADES (Farmer 1 & 5 from last Rabi season)
-- ============================================================================

INSERT INTO produce_grades
  (crop_id, batch_number, grade, quality_score, grain_size_uniformity_score,
   color_ripeness_score, surface_quality_score, moisture_estimate,
   quantity, market_price_per_unit, batch_revenue, graded_date, graded_by, notes)
VALUES
  -- Farmer 1, Wheat (harvested Rabi 2025-26), batch 1
  ('c1200000-0000-0000-0000-000000000001',
   'RMC-F1-001', 'A', 88, 90, 88, 85, 12.2, 3.0, 2250, 6750,
   '2026-03-22', 'Ramesh Sharma',
   'Good grain weight. Slight protein deficit due to low OC soil.'),

  -- Farmer 5, Wheat (harvested Rabi 2025-26), batch 1
  ('c5200000-0000-0000-0000-000000000005',
   'RMC-F5-001', 'A', 91, 93, 90, 88, 11.8, 3.5, 2250, 7875,
   '2026-03-28', 'Mohan Bishnoi',
   'High K soil contributed to excellent straw quality. Top-grade lot.'),

  -- Farmer 3, Barley (harvested Rabi 2025-26)
  ('c3200000-0000-0000-0000-000000000003',
   'RMC-F3-001', 'B', 76, 78, 74, 72, 13.5, 2.2, 1650, 3630,
   '2026-03-15', 'Gopal Yadav',
   'Zn deficiency affected grain fill. Grade B. Recommend Zn application next season.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. USER SETTINGS
-- ============================================================================

INSERT INTO user_settings (farmer_id, preferred_language, notification_enabled,
                            notification_channel, daily_digest_enabled, theme)
VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Hindi', true, 'in-app', true, 'light'),
  ('f2000000-0000-0000-0000-000000000002', 'Hindi', true, 'in-app', true, 'light'),
  ('f3000000-0000-0000-0000-000000000003', 'Hindi', true, 'in-app', false, 'light'),
  ('f4000000-0000-0000-0000-000000000004', 'Hindi', true, 'in-app', true, 'light'),
  ('f5000000-0000-0000-0000-000000000005', 'Hindi', true, 'in-app', true, 'light')
ON CONFLICT (farmer_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION — run these after seeding
-- ============================================================================
-- SELECT name, village, district FROM farmers;
-- SELECT name, area_acres, soil_type, location_lat, location_lng FROM plots;
-- SELECT crop_name, variety, current_stage, crop_state, health_status FROM crops;
-- SELECT crop_id, date, health_score, organic_carbon, soil_ph, soil_ec,
--        nitrogen_level FROM crop_health_daily ORDER BY date DESC LIMIT 20;
-- SELECT title, priority, status FROM recommendations;
-- SELECT title, severity, status FROM alerts;
