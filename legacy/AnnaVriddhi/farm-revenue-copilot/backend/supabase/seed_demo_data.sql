-- ============================================================================
-- AnnaVriddhi Demo Data Seed Script
-- ============================================================================
-- This script inserts sample data for testing the app
-- Replace 'YOUR_FARMER_ID' and 'YOUR_PLOT_ID' with actual IDs from your database

-- First, get your farmer ID by running this query:
-- SELECT id FROM farmers LIMIT 1;
-- Then replace 'FARMER_ID_HERE' in the queries below

-- ============================================================================
-- DEMO: Create test plots and crops
-- ============================================================================

-- Insert a test plot
INSERT INTO plots (farmer_id, name, area_acres, soil_type, location_lat, location_lng)
VALUES (
  'FARMER_ID_HERE',
  'Plot A - North Field',
  2.5,
  'Loamy',
  19.0760,
  72.8777
)
ON CONFLICT DO NOTHING;

-- Insert a second plot
INSERT INTO plots (farmer_id, name, area_acres, soil_type, location_lat, location_lng)
VALUES (
  'FARMER_ID_HERE',
  'Plot B - South Field',
  1.8,
  'Clay loam',
  19.0750,
  72.8770
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Create test crops
-- ============================================================================

-- Get your plot IDs first:
-- SELECT id, name FROM plots WHERE farmer_id = 'FARMER_ID_HERE';
-- Replace PLOT_ID_1 and PLOT_ID_2 below

-- Wheat crop in Plot A
INSERT INTO crops (plot_id, crop_name, variety, planted_date, expected_harvest_date, current_stage, health_status)
VALUES (
  'PLOT_ID_1',
  'Wheat',
  'HD2987',
  '2024-10-15',
  '2025-03-15',
  'Vegetative',
  'healthy'
)
ON CONFLICT DO NOTHING;

-- Cotton crop in Plot B
INSERT INTO crops (plot_id, crop_name, variety, planted_date, expected_harvest_date, current_stage, health_status)
VALUES (
  'PLOT_ID_2',
  'Cotton',
  'BG-III',
  '2024-06-15',
  '2025-01-15',
  'Boll formation',
  'at-risk'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Insert crop health data (7-day history)
-- ============================================================================

-- Get your crop IDs:
-- SELECT id, crop_name FROM crops WHERE plot_id = 'PLOT_ID_1';
-- Replace CROP_ID_1 below

-- Daily health readings for wheat (7 days)
INSERT INTO crop_health_daily (crop_id, date, health_score, moisture_pct, disease_risk_pct, nitrogen_level, canopy_cover_pct, organic_carbon, soil_ph, soil_ec, canopy_temperature)
VALUES
  ('CROP_ID_1', '2025-01-05', 82, 45.2, 12, 145, 42, 2.8, 6.9, 0.65, 18.5),
  ('CROP_ID_1', '2025-01-06', 80, 42.8, 15, 142, 40, 2.75, 6.8, 0.68, 19.2),
  ('CROP_ID_1', '2025-01-07', 78, 40.5, 18, 140, 38, 2.7, 6.9, 0.70, 20.1),
  ('CROP_ID_1', '2025-01-08', 76, 38.2, 22, 138, 36, 2.65, 7.0, 0.72, 21.5),
  ('CROP_ID_1', '2025-01-09', 74, 35.8, 25, 135, 34, 2.6, 7.0, 0.75, 22.3),
  ('CROP_ID_1', '2025-01-10', 72, 33.5, 28, 132, 32, 2.55, 6.95, 0.78, 23.1),
  ('CROP_ID_1', '2025-01-11', 70, 31.2, 32, 130, 30, 2.5, 6.9, 0.80, 23.8)
ON CONFLICT DO NOTHING;

-- Daily health readings for cotton
INSERT INTO crop_health_daily (crop_id, date, health_score, moisture_pct, disease_risk_pct, nitrogen_level, canopy_cover_pct, organic_carbon, soil_ph, soil_ec, canopy_temperature)
VALUES
  ('CROP_ID_2', '2025-01-05', 62, 58.5, 38, 120, 65, 2.2, 7.1, 1.10, 28.2),
  ('CROP_ID_2', '2025-01-06', 60, 56.2, 42, 118, 63, 2.15, 7.2, 1.15, 29.1),
  ('CROP_ID_2', '2025-01-07', 58, 54.0, 45, 115, 61, 2.1, 7.2, 1.18, 30.2),
  ('CROP_ID_2', '2025-01-08', 56, 52.5, 48, 112, 59, 2.05, 7.3, 1.20, 31.5),
  ('CROP_ID_2', '2025-01-09', 54, 50.8, 52, 110, 57, 2.0, 7.3, 1.22, 32.1),
  ('CROP_ID_2', '2025-01-10', 52, 49.2, 55, 108, 55, 1.95, 7.25, 1.25, 33.0),
  ('CROP_ID_2', '2025-01-11', 50, 47.5, 58, 105, 53, 1.9, 7.2, 1.28, 33.8)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Insert recommendations
-- ============================================================================

INSERT INTO recommendations (
  crop_id, farmer_id, type, priority, title, body, why_now,
  predicted_revenue_impact, frequency, deadline_date, status
)
VALUES
  (
    'CROP_ID_1',
    'FARMER_ID_HERE',
    'irrigation',
    'high',
    'Increase Irrigation Frequency',
    'Soil moisture has dropped to 31.2%. Increase watering to maintain optimal 45-50% moisture for vegetative growth.',
    'Current moisture is below optimal range. Continued deficit will stunt growth and reduce yield.',
    2500,
    'Every 2 days',
    '2025-01-15',
    'pending'
  ),
  (
    'CROP_ID_1',
    'FARMER_ID_HERE',
    'fertilizer',
    'medium',
    'Apply Nitrogen Fertilizer',
    'Nitrogen levels at 130 kg/ha. Apply 50 kg/ha urea to support vegetative phase growth.',
    'Crop requires N boost for leaf development. Timing window is 2-3 weeks.',
    1800,
    'Once per season',
    '2025-01-20',
    'pending'
  ),
  (
    'CROP_ID_2',
    'FARMER_ID_HERE',
    'pest-management',
    'high',
    'Monitor for Bollworm Infestation',
    'Disease risk at 58%. Scout for pink bollworm damage. Consider releasing parasitoid wasps if >2 eggs/100 bolls.',
    'Peak bollworm season during boll formation. Early detection critical to prevent losses.',
    3200,
    'Weekly scouting',
    '2025-01-12',
    'pending'
  ),
  (
    'CROP_ID_2',
    'FARMER_ID_HERE',
    'harvest',
    'low',
    'Plan Harvest Window',
    'Expected harvest ready in 2 weeks (around Jan 25). Start logistics planning for cotton picking.',
    'Current stage is late boll formation. Harvest readiness approaching.',
    5000,
    'Once at maturity',
    '2025-01-25',
    'pending'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Insert alerts
-- ============================================================================

INSERT INTO alerts (
  crop_id, farmer_id, alert_type, severity, title, description,
  affected_area, risk_level, action_deadline, recommended_action,
  estimated_cost, status
)
VALUES
  (
    'CROP_ID_2',
    'FARMER_ID_HERE',
    'disease',
    'urgent',
    'High Disease Risk Detected',
    'Plant disease risk index at 58%. Fungal infection likely in current humidity + temperature conditions.',
    '1.8 acres (Plot B)',
    'Critical',
    '2025-01-12',
    'Apply fungicide immediately. Increase air circulation by pruning lower branches.',
    800,
    'active'
  ),
  (
    'CROP_ID_1',
    'FARMER_ID_HERE',
    'moisture',
    'warning',
    'Soil Moisture Low',
    'Soil moisture declined to 31.2% over 7 days. Without irrigation in next 48 hours, yield loss expected.',
    '2.5 acres (Plot A)',
    'High',
    '2025-01-13',
    'Water the field. Target 45-50% soil moisture.',
    200,
    'active'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Insert season
-- ============================================================================

INSERT INTO seasons (
  farmer_id, season_name, start_date, end_date, crop_id, plot_id,
  total_revenue_added, recommendations_followed, average_produce_grade, is_active
)
VALUES (
  'FARMER_ID_HERE',
  'Kharif 2024',
  '2024-06-15',
  NULL,
  'CROP_ID_2',
  'PLOT_ID_2',
  8500,
  1,
  'A',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Insert weather forecast (7 days)
-- ============================================================================

INSERT INTO weather_forecast (
  plot_id, forecast_date, weather_icon, temp_min, temp_max,
  rainfall_mm, humidity_pct, wind_speed_kmh, forecast_generated_at
)
VALUES
  ('PLOT_ID_1', '2025-01-12', '☁️', 12, 28, 0, 45, 8, NOW()),
  ('PLOT_ID_1', '2025-01-13', '🌤️', 13, 30, 0, 40, 6, NOW()),
  ('PLOT_ID_1', '2025-01-14', '☁️', 11, 25, 5, 55, 12, NOW()),
  ('PLOT_ID_1', '2025-01-15', '🌧️', 10, 22, 15, 70, 15, NOW()),
  ('PLOT_ID_1', '2025-01-16', '⛅', 12, 26, 2, 50, 10, NOW()),
  ('PLOT_ID_1', '2025-01-17', '☀️', 14, 32, 0, 35, 5, NOW()),
  ('PLOT_ID_1', '2025-01-18', '☀️', 15, 34, 0, 32, 4, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Insert grading history
-- ============================================================================

INSERT INTO produce_grades (
  crop_id, batch_number, grade, quality_score, grain_size_uniformity_score,
  color_ripeness_score, surface_quality_score, moisture_estimate, quantity,
  market_price_per_unit, batch_revenue, graded_date, graded_by
)
VALUES
  (
    'CROP_ID_1',
    'BATCH-001',
    'A',
    92,
    95,
    90,
    88,
    12.5,
    2.5,
    2500,
    6250,
    '2024-12-20',
    'Ramesh Kumar'
  ),
  (
    'CROP_ID_1',
    'BATCH-002',
    'B',
    78,
    82,
    75,
    80,
    13.8,
    2.2,
    2100,
    4620,
    '2024-12-25',
    'Ramesh Kumar'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO: Insert messages
-- ============================================================================

INSERT INTO messages (
  farmer_id, message_type, title, body, channel,
  is_read, created_at
)
VALUES
  (
    'FARMER_ID_HERE',
    'alert',
    'Urgent: Soil moisture critical',
    'Your wheat field has low soil moisture. Water within 24 hours.',
    'in-app',
    false,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'FARMER_ID_HERE',
    'recommendation',
    'New recommendation: Apply fungicide',
    'Cotton disease risk is high. We recommend applying fungicide treatment.',
    'in-app',
    false,
    NOW() - INTERVAL '1 hour'
  ),
  (
    'FARMER_ID_HERE',
    'scheme',
    'PM-KISAN payment pending',
    'Your PM-KISAN installment of ₹2,000 is pending approval.',
    'in-app',
    true,
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify data was inserted:

-- SELECT COUNT(*) FROM plots WHERE farmer_id = 'FARMER_ID_HERE';
-- SELECT COUNT(*) FROM crops WHERE plot_id IN (SELECT id FROM plots WHERE farmer_id = 'FARMER_ID_HERE');
-- SELECT COUNT(*) FROM crop_health_daily;
-- SELECT COUNT(*) FROM recommendations WHERE farmer_id = 'FARMER_ID_HERE';
-- SELECT COUNT(*) FROM alerts WHERE farmer_id = 'FARMER_ID_HERE';
-- SELECT COUNT(*) FROM produce_grades;
-- SELECT COUNT(*) FROM messages WHERE farmer_id = 'FARMER_ID_HERE';
