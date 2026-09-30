'use strict';

/**
 * recommendationService.js
 * Generates and stores crop recommendations based on crop state snapshots and weather.
 * Sources: crop-state score, weather, soil, grading output.
 */

const db = require('../models/db');

// ── Per-crop thresholds configuration ──
const CROP_THRESHOLDS = {
  // Default thresholds (used if crop_type not found below)
  default: {
    moisture_min: 40,        // Below this = irrigation needed
    pest_pressure_max: 60,   // Below this = pest problem (lower score = more pests)
    leaf_color_min: 65,      // Below this = nutrient deficiency
    storm_risk_flag: true,   // Consider storm warnings
  },
  
  // Crop-specific thresholds
  wheat: {
    moisture_min: 45,
    pest_pressure_max: 65,
    leaf_color_min: 70,
    storm_risk_flag: true,
  },
  rice: {
    moisture_min: 60,        // Rice needs more water
    pest_pressure_max: 60,
    leaf_color_min: 68,
    storm_risk_flag: true,
  },
  cotton: {
    moisture_min: 40,
    pest_pressure_max: 55,   // Cotton is pest-prone
    leaf_color_min: 65,
    storm_risk_flag: true,
  },
  sugarcane: {
    moisture_min: 50,
    pest_pressure_max: 65,
    leaf_color_min: 70,
    storm_risk_flag: true,
  },
  maize: {
    moisture_min: 42,
    pest_pressure_max: 62,
    leaf_color_min: 68,
    storm_risk_flag: true,
  },
};

/**
 * Get thresholds for a specific crop type.
 * @param {string} cropType
 * @returns {object}
 */
function getThresholds(cropType) {
  if (!cropType) return CROP_THRESHOLDS.default;
  const normalized = cropType.toLowerCase().trim().replace(/\s+/g, '-');
  return CROP_THRESHOLDS[normalized] || CROP_THRESHOLDS.default;
}

/**
 * Evaluate crop conditions and determine recommendation type.
 * Returns explicit 'do_nothing' if no conditions trigger.
 * 
 * @param {string} cropId
 * @param {object} snapshot - Latest crop_state_snapshots row
 * @param {object} weather - Weather forecast from weatherApi
 * @param {string} cropType - Crop type for threshold lookup
 * @returns {Promise<{ type: string, priority: string, title: string, body: string }>}
 */
async function evaluate(cropId, snapshot, weather, cropType) {
  const thresholds = getThresholds(cropType);
  
  // Priority levels based on severity
  const getPriority = (value, threshold, isLower = true) => {
    if (!value || !threshold) return 'medium';
    const diff = isLower ? (threshold - value) : (value - threshold);
    const pct = Math.abs(diff / threshold) * 100;
    if (pct >= 20) return 'high';
    if (pct >= 10) return 'medium';
    return 'low';
  };

  // ── 1. CHECK FOR STORM/HAIL RISK (highest priority) ──
  if (thresholds.storm_risk_flag && weather.forecast72h && weather.forecast72h.length > 0) {
    const hasStormRisk = weather.forecast72h.some(f => 
      f.description && (
        f.description.toLowerCase().includes('storm') ||
        f.description.toLowerCase().includes('hail') ||
        f.description.toLowerCase().includes('thunderstorm') ||
        f.description.toLowerCase().includes('heavy rain')
      )
    );
    
    if (hasStormRisk) {
      return {
        type: 'cover',
        priority: 'high',
        title: 'Storm Warning - Cover Crops',
        body: 'Heavy weather expected in next 72 hours. Consider protecting your crop with covers or nets to prevent damage.',
      };
    }
  }

  // ── 2. CHECK FOR PEST PRESSURE (high priority if severe) ──
  if (snapshot.pest_pressure_score !== null && 
      snapshot.pest_pressure_score < thresholds.pest_pressure_max) {
    const priority = getPriority(snapshot.pest_pressure_score, thresholds.pest_pressure_max, true);
    return {
      type: 'pesticide',
      priority,
      title: 'Pest Control Needed',
      body: `Pest pressure detected (score: ${snapshot.pest_pressure_score}). Apply appropriate pesticide to prevent yield loss.`,
    };
  }

  // ── 3. CHECK FOR NUTRIENT DEFICIENCY ──
  if (snapshot.leaf_color_score !== null && 
      snapshot.leaf_color_score < thresholds.leaf_color_min) {
    const priority = getPriority(snapshot.leaf_color_score, thresholds.leaf_color_min, true);
    return {
      type: 'fertilizer',
      priority,
      title: 'Nutrient Deficiency Detected',
      body: `Leaf analysis shows low score (${snapshot.leaf_color_score}). Apply fertilizer to improve crop health and yield.`,
    };
  }

  // ── 4. CHECK FOR IRRIGATION NEED (water-balance model) ──
  // Use irrigationService for smart water-balance calculation
  // This replaces the flat threshold check
  try {
    const irrigationService = require('./irrigationService');
    const waterBalance = await irrigationService.computeWaterBalance(cropId);
    
    if (waterBalance.recommend_irrigation) {
      const priority = waterBalance.deficit_mm > 30 ? 'high' :
                       waterBalance.deficit_mm > 15 ? 'medium' : 'low';
      
      return {
        type: 'irrigation',
        priority,
        title: 'Irrigation Required',
        body: `Water deficit: ${waterBalance.deficit_mm.toFixed(1)}mm. ` +
              `Apply ${waterBalance.suggested_amount_mm}mm. ` +
              `Forecast rain: ${waterBalance.forecast_rainfall_mm.toFixed(1)}mm insufficient.`,
      };
    }
  } catch (err) {
    console.error('[recommendationService] Water balance check failed:', err.message);
    // Fall back to simple moisture check if water balance fails
    if (snapshot.soil_moisture_pct !== null && 
        snapshot.soil_moisture_pct < thresholds.moisture_min) {
      
      // Check if rain is coming in next 24h
      let rainExpected = false;
      if (weather.forecast24h && weather.forecast24h.length > 0) {
        const totalRain = weather.forecast24h.reduce((sum, f) => sum + (f.rain || 0), 0);
        rainExpected = totalRain > 5; // 5mm threshold
      }
      
      if (!rainExpected) {
        const priority = getPriority(snapshot.soil_moisture_pct, thresholds.moisture_min, true);
        return {
          type: 'irrigation',
          priority,
          title: 'Irrigation Required',
          body: `Soil moisture low (${snapshot.soil_moisture_pct}%). No rain forecast. Irrigate to maintain optimal growth.`,
        };
      }
    }
  }

  // ── 5. NO ACTION NEEDED (explicit do_nothing) ──
  return {
    type: 'do_nothing',
    priority: 'low',
    title: 'Crop Condition Good',
    body: 'All parameters are within optimal range. Continue regular monitoring.',
  };
}

/**
 * Get all recommendations for a crop from database.
 * @param {string} cropId
 * @returns {Promise<Array>}
 */
async function getForCrop(cropId) {
  const result = await db.query(
    `SELECT * FROM recommendation_events 
     WHERE crop_id = $1 
     ORDER BY created_at DESC`,
    [cropId]
  );
  return result.rows;
}

/**
 * Acknowledge a recommendation (farmer response).
 * @param {string} recommendationId
 * @param {object} data - { action, notes }
 * @returns {Promise<object>}
 */
async function acknowledge(recommendationId, { action, notes }) {
  const status = action && action !== 'dismissed' ? 'acted' : 'acknowledged';
  
  const result = await db.query(
    `UPDATE recommendation_events 
     SET status = $1, 
         action_taken = $2, 
         action_notes = $3, 
         acknowledged_at = NOW() 
     WHERE id = $4 
     RETURNING *`,
    [status, action, notes, recommendationId]
  );
  
  return result.rows[0];
}

/**
 * Generate a new batch of recommendations for a crop and persist them.
 * Called by the scheduled job.
 * @param {string} cropId
 * @deprecated - Use alertJob.js which calls evaluate() directly
 */
async function generate(cropId) {
  // This is now handled by alertJob.js for better integration with weather and revenue estimation
  console.warn('[recommendationService] generate() is deprecated - use alertJob.js');
  return [];
}

module.exports = { 
  evaluate, 
  getForCrop, 
  acknowledge, 
  generate,
  getThresholds,
  CROP_THRESHOLDS,
};
