'use strict';

/**
 * routes/sensors.js
 * Soil sensor readings API — supports ESP8266 writes and frontend reads.
 *
 * ESP8266 payload (POST /api/sensors/:cropId):
 * {
 *   sensor_id: "ESP8266-001",        // optional
 *   soil_moisture_pct: 74.2,
 *   soil_temperature_c: 26.1,        // optional
 *   soil_ph: 6.5,                    // optional
 *   nitrogen_kgac: 58,               // optional
 *   phosphorus_kgac: 22,             // optional
 *   potassium_kgac: 180,             // optional
 *   recorded_at: "2026-09-12T..."    // optional ISO timestamp
 * }
 */

const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = Router();

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

/**
 * GET /api/sensors/:cropId/latest
 * Returns the most recent sensor reading batch for a crop.
 */
router.get('/:cropId/latest', async (req, res, next) => {
  try {
    const { cropId } = req.params;
    const supabase = getSupabase();

    // Fetch the latest reading for each reading_type
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('crop_id', cropId)
      .order('recorded_at', { ascending: false })
      .limit(20);

    if (error) return next(error);

    // Group by reading_type, keep only the latest per type
    const latestByType = {};
    for (const row of (data || [])) {
      if (!latestByType[row.reading_type]) {
        latestByType[row.reading_type] = row;
      }
    }

    res.json({
      success: true,
      cropId,
      readings: Object.values(latestByType),
      latestTimestamp: data && data.length > 0 ? data[0].recorded_at : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sensors/:cropId/history
 * Returns recent readings for charting (last N hours).
 */
router.get('/:cropId/history', async (req, res, next) => {
  try {
    const { cropId } = req.params;
    const hours = Math.min(parseInt(req.query.hours) || 24, 168);
    const supabase = getSupabase();

    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('crop_id', cropId)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });

    if (error) return next(error);

    res.json({ success: true, cropId, readings: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sensors/:cropId
 * Ingest a sensor reading batch. Accepts both ESP8266 hardware and manual entries.
 *
 * Body fields:
 *   source: "sensor" | "manual"  (default: "sensor")
 *   sensor_id: string            (optional, identifies the device)
 *   soil_moisture_pct: number    (required)
 *   soil_temperature_c: number
 *   soil_ph: number
 *   nitrogen_kgac: number
 *   phosphorus_kgac: number
 *   potassium_kgac: number
 *   recorded_at: ISO string      (defaults to now)
 */
router.post('/:cropId', async (req, res, next) => {
  try {
    const { cropId } = req.params;
    const {
      source = 'sensor',
      sensor_id,
      soil_moisture_pct,
      soil_temperature_c,
      soil_ph,
      nitrogen_kgac,
      phosphorus_kgac,
      potassium_kgac,
      recorded_at,
    } = req.body;

    // Validate required field
    if (soil_moisture_pct === undefined || soil_moisture_pct === null) {
      return res.status(400).json({ error: 'soil_moisture_pct is required' });
    }
    const moisture = parseFloat(soil_moisture_pct);
    if (isNaN(moisture) || moisture < 0 || moisture > 100) {
      return res.status(400).json({ error: 'soil_moisture_pct must be 0–100' });
    }

    const ts = recorded_at || new Date().toISOString();
    const supabase = getSupabase();

    // Build rows for each provided reading type
    const rows = [];

      const addRow = (type, value, unit, optimalRange) => {
        rows.push({
          crop_id: cropId,
          farmer_id: req.body.farmer_id || null,  // passed by frontend or derived from auth
          sensor_id: sensor_id || (source === 'manual' ? 'manual' : 'ESP8266'),
          reading_type: type,
          value,
          unit,
          optimal_range: optimalRange || null,
          source,
          recorded_at: ts,
        });
      };

    addRow('soil_moisture_pct', moisture, '%', '65–80');

    if (soil_temperature_c !== undefined && soil_temperature_c !== null) {
      const v = parseFloat(soil_temperature_c);
      if (!isNaN(v)) addRow('soil_temperature_c', v, '°C', '20–30');
    }
    if (soil_ph !== undefined && soil_ph !== null) {
      const v = parseFloat(soil_ph);
      if (!isNaN(v) && v >= 0 && v <= 14) addRow('soil_ph', v, 'pH', '6.0–7.5');
    }
    if (nitrogen_kgac !== undefined && nitrogen_kgac !== null) {
      const v = parseFloat(nitrogen_kgac);
      if (!isNaN(v) && v >= 0) addRow('nitrogen_kgac', v, 'kg/acre', '80–120');
    }
    if (phosphorus_kgac !== undefined && phosphorus_kgac !== null) {
      const v = parseFloat(phosphorus_kgac);
      if (!isNaN(v) && v >= 0) addRow('phosphorus_kgac', v, 'kg/acre', '20–40');
    }
    if (potassium_kgac !== undefined && potassium_kgac !== null) {
      const v = parseFloat(potassium_kgac);
      if (!isNaN(v) && v >= 0) addRow('potassium_kgac', v, 'kg/acre', '100–150');
    }

    const { data, error } = await supabase
      .from('sensor_readings')
      .insert(rows)
      .select();

    if (error) return next(error);

    res.status(201).json({
      success: true,
      inserted: data?.length || rows.length,
      source,
      recorded_at: ts,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
