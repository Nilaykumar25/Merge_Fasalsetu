'use strict';

/**
 * irrigationService.js
 * Computes irrigation schedules using water-balance model.
 * Inputs: soil-moisture sensor data + weather forecast + crop water requirements.
 * 
 * Water balance formula:
 * deficit_mm = crop_water_requirement - forecast_rainfall - current_moisture_contribution
 */

const db = require('../models/db');
const weatherApi = require('../integrations/weatherApi');
const { getWaterRequirement } = require('../config/cropWaterRequirements');

// Conversion constants
const SOIL_DEPTH_MM = 300;        // Assume effective root zone depth (300mm = 30cm)
const FIELD_CAPACITY_PCT = 100;   // 100% moisture = field capacity

/**
 * Convert soil moisture percentage to mm of available water.
 * Simple linear approximation: moisture_pct × soil_depth_mm / 100
 * 
 * @param {number} moisturePct - Soil moisture percentage (0-100)
 * @returns {number} - Available water in mm
 */
function convertMoistureToMm(moisturePct) {
  if (moisturePct === null || moisturePct === undefined) return 0;
  
  // Linear approximation: % of field capacity × root zone depth
  // This is simplified; real calculation would use field capacity and wilting point
  const availableWaterMm = (moisturePct / FIELD_CAPACITY_PCT) * SOIL_DEPTH_MM;
  
  return Math.max(0, availableWaterMm);
}

/**
 * Compute water balance for a crop and determine irrigation need.
 * 
 * @param {string} cropId - UUID of the crop
 * @param {number} forecastWindowHours - Hours to look ahead (default 72)
 * @returns {Promise<object>} - Water balance analysis
 */
async function computeWaterBalance(cropId, forecastWindowHours = 72) {
  try {
    // 1. Fetch crop details and latest snapshot
    const cropResult = await db.query(
      `SELECT 
        c.id,
        c.crop_type,
        c.area_ac,
        css.soil_moisture_pct,
        css.growth_stage_pct,
        css.computed_at,
        css.data_quality
       FROM crops c
       LEFT JOIN LATERAL (
         SELECT * FROM crop_state_snapshots
         WHERE crop_id = c.id
         ORDER BY computed_at DESC
         LIMIT 1
       ) css ON true
       WHERE c.id = $1`,
      [cropId]
    );

    if (cropResult.rows.length === 0) {
      throw new Error(`Crop ${cropId} not found`);
    }

    const crop = cropResult.rows[0];

    // Check if snapshot exists
    if (!crop.computed_at) {
      return {
        cropId,
        error: 'No crop state snapshot available',
        recommend_irrigation: false,
        deficit_mm: 0,
      };
    }

    // 2. Get crop water requirement (mm/day)
    const dailyRequirement = getWaterRequirement(
      crop.crop_type,
      crop.growth_stage_pct
    );

    // Calculate total requirement for forecast window
    const forecastDays = forecastWindowHours / 24;
    const totalRequirementMm = dailyRequirement * forecastDays;

    // 3. Fetch weather forecast
    // TODO: Get actual farm location coordinates
    const DEFAULT_LAT = 18.5204; // Pune
    const DEFAULT_LON = 73.8567;
    const weather = await weatherApi.fetchWeather(DEFAULT_LAT, DEFAULT_LON);

    // 4. Calculate forecast rainfall for the window
    let forecastRainfallMm = 0;
    if (forecastWindowHours <= 24 && weather.forecast24h) {
      forecastRainfallMm = weather.forecast24h.reduce((sum, f) => sum + (f.rain || 0), 0);
    } else if (weather.forecast72h) {
      // Use 72h forecast
      const hoursToInclude = Math.min(forecastWindowHours, 72);
      const entriesPerDay = 8; // 3-hour intervals
      const entriesToInclude = Math.ceil((hoursToInclude / 24) * entriesPerDay);
      forecastRainfallMm = weather.forecast72h
        .slice(0, entriesToInclude)
        .reduce((sum, f) => sum + (f.rain || 0), 0);
    }

    // 5. Convert current soil moisture to mm
    const currentMoistureMm = convertMoistureToMm(crop.soil_moisture_pct);

    // Only count moisture contribution if above minimum threshold
    // (soil below 30% is not effectively available to plants)
    const MIN_AVAILABLE_MOISTURE_PCT = 30;
    const moistureContributionMm = crop.soil_moisture_pct > MIN_AVAILABLE_MOISTURE_PCT
      ? currentMoistureMm * 0.5  // Assume 50% of current moisture is available during forecast window
      : 0;

    // 6. Calculate water deficit
    const deficitMm = totalRequirementMm - forecastRainfallMm - moistureContributionMm;

    // 7. Determine recommendation
    const recommendIrrigation = deficitMm > 5; // 5mm threshold to avoid tiny amounts
    const suggestedAmountMm = recommendIrrigation ? Math.ceil(deficitMm) : 0;

    // 8. Calculate days until irrigation needed (if moisture is adequate for now)
    let daysUntilNeeded = null;
    if (!recommendIrrigation && crop.soil_moisture_pct) {
      const currentSupplyDays = moistureContributionMm / dailyRequirement;
      daysUntilNeeded = Math.floor(currentSupplyDays);
    }

    const result = {
      cropId,
      crop_type: crop.crop_type,
      growth_stage_pct: crop.growth_stage_pct,
      
      // Inputs
      current_soil_moisture_pct: crop.soil_moisture_pct,
      current_moisture_mm: currentMoistureMm,
      moisture_contribution_mm: moistureContributionMm,
      
      // Requirements
      daily_water_requirement_mm: dailyRequirement,
      forecast_window_hours: forecastWindowHours,
      forecast_window_days: forecastDays,
      total_requirement_mm: totalRequirementMm,
      
      // Forecast
      forecast_rainfall_mm: forecastRainfallMm,
      
      // Balance
      deficit_mm: deficitMm,
      
      // Recommendation
      recommend_irrigation: recommendIrrigation,
      suggested_amount_mm: suggestedAmountMm,
      days_until_needed: daysUntilNeeded,
      
      // Metadata
      computed_at: new Date().toISOString(),
      snapshot_age_hours: Math.round(
        (Date.now() - new Date(crop.computed_at).getTime()) / (1000 * 60 * 60)
      ),
      data_quality: crop.data_quality,
    };

    console.log(
      `[irrigationService] ${crop.crop_type} water balance: ` +
      `require=${totalRequirementMm.toFixed(1)}mm, ` +
      `forecast_rain=${forecastRainfallMm.toFixed(1)}mm, ` +
      `moisture=${moistureContributionMm.toFixed(1)}mm, ` +
      `deficit=${deficitMm.toFixed(1)}mm, ` +
      `recommend=${recommendIrrigation}`
    );

    return result;

  } catch (err) {
    console.error('[irrigationService] Error computing water balance:', err.message);
    throw err;
  }
}

/**
 * Get irrigation schedule and history for a crop.
 * @param {string} cropId - UUID of the crop
 * @returns {Promise<object>} - Schedule and logs
 */
async function getSchedule(cropId) {
  try {
    // Get current water balance prediction
    const prediction = await computeWaterBalance(cropId);

    // Get irrigation history
    const logsResult = await db.query(
      `SELECT * FROM irrigation_logs 
       WHERE crop_id = $1 
       ORDER BY date DESC 
       LIMIT 10`,
      [cropId]
    );

    return {
      prediction,
      history: logsResult.rows,
      cropId,
    };

  } catch (err) {
    console.error('[irrigationService] Error getting schedule:', err.message);
    throw err;
  }
}

/**
 * Log an irrigation event.
 * @param {string} cropId - UUID of the crop
 * @param {object} data - { date, amountMm, method, notes }
 * @returns {Promise<object>} - Logged event
 */
async function logEvent(cropId, { date, amountMm, method, notes }) {
  try {
    const result = await db.query(
      `INSERT INTO irrigation_logs (crop_id, date, amount_mm, method)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        cropId,
        date || new Date().toISOString().split('T')[0], // Default to today
        amountMm,
        method || 'manual',
      ]
    );

    console.log(
      `[irrigationService] Logged irrigation for crop ${cropId}: ` +
      `${amountMm}mm via ${method || 'manual'}`
    );

    return result.rows[0];

  } catch (err) {
    console.error('[irrigationService] Error logging event:', err.message);
    throw err;
  }
}

module.exports = { 
  computeWaterBalance,
  getSchedule, 
  logEvent,
  convertMoistureToMm,
};
