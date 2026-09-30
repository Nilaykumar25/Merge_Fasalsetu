'use strict';

/**
 * jobs/cropStateJob.js
 * Scheduled job — recomputes crop-state scores for all active crops
 * and inserts snapshots into crop_state_snapshots table.
 *
 * Run this on a cron (e.g. every 6 hours) via node-cron or external scheduler.
 *
 * Example standalone execution:
 *   node -e "require('./src/jobs/cropStateJob').run()"
 */

const db = require('../models/db');
const sensorIngest = require('../integrations/sensorIngest');
const { getMaturityDays } = require('../config/cropMaturity');

// ── Scoring weights configuration ──
const SCORE_WEIGHTS = {
  soil_moisture:   0.30,  // 30%
  leaf_color:      0.25,  // 25%
  pest_pressure:   0.25,  // 25%
  growth_stage:    0.20,  // 20%
};

/**
 * Main entry point — called by the scheduler.
 */
async function run() {
  console.log('[cropStateJob] Starting crop-state computation…');

  try {
    // Fetch all active crops
    const result = await db.query(
      `SELECT id, crop_type, sow_date 
       FROM crops 
       WHERE status = 'active'
       ORDER BY sow_date DESC`,
      []
    );

    const activeCrops = result.rows;
    console.log(`[cropStateJob] Found ${activeCrops.length} active crops to process`);

    let successCount = 0;
    let failureCount = 0;

    for (const crop of activeCrops) {
      try {
        await processOneCrop(crop);
        successCount++;
      } catch (err) {
        console.error(`[cropStateJob] Error processing crop ${crop.id}:`, err.message);
        failureCount++;
      }
    }

    console.log(`[cropStateJob] Done. Success: ${successCount}, Failures: ${failureCount}`);
  } catch (err) {
    console.error('[cropStateJob] Fatal error:', err);
    throw err;
  }
}

/**
 * Process a single crop: fetch data, compute score, insert snapshot.
 * @param {{ id: string, crop_type: string, sow_date: string }} crop
 */
async function processOneCrop(crop) {
  const cropId = crop.id;
  let dataQuality = 'complete';
  const signals = {};

  // ── 1. Fetch soil moisture from sensor ──
  try {
    const moistureData = await sensorIngest.fetchMoisture(cropId);
    if (moistureData) {
      signals.soil_moisture_pct = moistureData.soil_moisture_pct;
    } else {
      signals.soil_moisture_pct = null;
      dataQuality = 'partial';
    }
  } catch (err) {
    console.error(`[cropStateJob] Sensor fetch failed for ${cropId}:`, err.message);
    signals.soil_moisture_pct = null;
    dataQuality = 'partial';
  }

  // ── 2. Derive leaf color score from latest field photo ──
  // TODO: Integrate with image analysis pipeline when ready
  // For now, use placeholder logic
  try {
    signals.leaf_color_score = await deriveLeafColorScore(cropId);
  } catch (err) {
    console.error(`[cropStateJob] Leaf color analysis failed for ${cropId}:`, err.message);
    signals.leaf_color_score = null;
    dataQuality = 'partial';
  }

  // ── 3. Derive pest pressure score from latest field photo ──
  // TODO: Integrate with image analysis pipeline when ready
  try {
    signals.pest_pressure_score = await derivePestPressureScore(cropId);
  } catch (err) {
    console.error(`[cropStateJob] Pest pressure analysis failed for ${cropId}:`, err.message);
    signals.pest_pressure_score = null;
    dataQuality = 'partial';
  }

  // ── 4. Compute growth stage percentage ──
  try {
    signals.growth_stage_pct = computeGrowthStage(crop.sow_date, crop.crop_type);
  } catch (err) {
    console.error(`[cropStateJob] Growth stage computation failed for ${cropId}:`, err.message);
    signals.growth_stage_pct = null;
    dataQuality = 'partial';
  }

  // ── 5. Compute composite score ──
  const score = computeCompositeScore(signals);

  // ── 6. Insert snapshot into database ──
  await db.query(
    `INSERT INTO crop_state_snapshots 
      (crop_id, score, soil_moisture_pct, leaf_color_score, pest_pressure_score, 
       growth_stage_pct, data_quality, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      cropId,
      score,
      signals.soil_moisture_pct,
      signals.leaf_color_score,
      signals.pest_pressure_score,
      signals.growth_stage_pct,
      dataQuality,
    ]
  );

  console.log(
    `[cropStateJob] Crop ${cropId}: score=${score}, quality=${dataQuality}, ` +
    `moisture=${signals.soil_moisture_pct}, leaf=${signals.leaf_color_score}, ` +
    `pest=${signals.pest_pressure_score}, growth=${signals.growth_stage_pct}`
  );
}

/**
 * Compute growth stage as percentage of expected maturity.
 * @param {string} sowDate - ISO date string
 * @param {string} cropType - Crop type name
 * @returns {number} - Percentage (0-100)
 */
function computeGrowthStage(sowDate, cropType) {
  if (!sowDate) {
    throw new Error('Missing sow_date');
  }

  const sowTime = new Date(sowDate).getTime();
  const now = Date.now();
  const daysSinceSow = (now - sowTime) / (1000 * 60 * 60 * 24);

  const maturityDays = getMaturityDays(cropType);
  const growthPct = Math.min(100, (daysSinceSow / maturityDays) * 100);

  return parseFloat(growthPct.toFixed(2));
}

/**
 * Derive leaf color score from the latest field photo.
 * Placeholder implementation - returns fixed value until image pipeline is ready.
 * @param {string} cropId
 * @returns {Promise<number>} Score between 0-100
 */
async function deriveLeafColorScore(cropId) {
  // TODO: Query field_photos table for latest image
  // TODO: Call image analysis service to extract green intensity, chlorophyll proxy
  
  // Placeholder: return a deterministic value based on crop ID for testing
  // In production, this should analyze actual crop photos
  const baseScore = 70 + (cropId.charCodeAt(0) % 25); // 70-95 range
  return parseFloat(baseScore.toFixed(2));
}

/**
 * Derive pest pressure score from the latest field photo.
 * Placeholder implementation - returns fixed value until image pipeline is ready.
 * @param {string} cropId
 * @returns {Promise<number>} Score between 0-100 (higher = less pest damage)
 */
async function derivePestPressureScore(cropId) {
  // TODO: Query field_photos table for latest image
  // TODO: Call image analysis service to detect pest damage, lesions, discoloration
  
  // Placeholder: return a deterministic value based on crop ID for testing
  const baseScore = 75 + (cropId.charCodeAt(1) % 20); // 75-95 range
  return parseFloat(baseScore.toFixed(2));
}

/**
 * Compute weighted composite score from all signals.
 * Missing signals are excluded from the calculation.
 * @param {object} signals - { soil_moisture_pct, leaf_color_score, pest_pressure_score, growth_stage_pct }
 * @returns {number} - Composite score (0-100)
 */
function computeCompositeScore(signals) {
  let weightedSum = 0;
  let totalWeight = 0;

  // Soil moisture: normalize to 0-100 scale (optimal around 60-80%)
  if (signals.soil_moisture_pct !== null && signals.soil_moisture_pct !== undefined) {
    const moistureScore = normalizeMoisture(signals.soil_moisture_pct);
    weightedSum += moistureScore * SCORE_WEIGHTS.soil_moisture;
    totalWeight += SCORE_WEIGHTS.soil_moisture;
  }

  // Leaf color: already 0-100
  if (signals.leaf_color_score !== null && signals.leaf_color_score !== undefined) {
    weightedSum += signals.leaf_color_score * SCORE_WEIGHTS.leaf_color;
    totalWeight += SCORE_WEIGHTS.leaf_color;
  }

  // Pest pressure: already 0-100
  if (signals.pest_pressure_score !== null && signals.pest_pressure_score !== undefined) {
    weightedSum += signals.pest_pressure_score * SCORE_WEIGHTS.pest_pressure;
    totalWeight += SCORE_WEIGHTS.pest_pressure;
  }

  // Growth stage: already 0-100
  if (signals.growth_stage_pct !== null && signals.growth_stage_pct !== undefined) {
    weightedSum += signals.growth_stage_pct * SCORE_WEIGHTS.growth_stage;
    totalWeight += SCORE_WEIGHTS.growth_stage;
  }

  // If all signals missing, return 0
  if (totalWeight === 0) {
    return 0;
  }

  // Normalize by actual total weight (in case some signals were missing)
  const score = Math.round((weightedSum / totalWeight) * 100) / 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Normalize soil moisture percentage to a 0-100 score.
 * Optimal range: 60-80%, penalize both too dry and too wet.
 * @param {number} moisturePct - Soil moisture percentage
 * @returns {number} - Normalized score (0-100)
 */
function normalizeMoisture(moisturePct) {
  if (moisturePct >= 60 && moisturePct <= 80) {
    return 100; // Optimal range
  } else if (moisturePct < 60) {
    // Too dry: linear penalty
    return Math.max(0, (moisturePct / 60) * 100);
  } else {
    // Too wet: linear penalty
    return Math.max(0, 100 - ((moisturePct - 80) / 20) * 100);
  }
}

module.exports = { run, processOneCrop, computeGrowthStage, computeCompositeScore };
