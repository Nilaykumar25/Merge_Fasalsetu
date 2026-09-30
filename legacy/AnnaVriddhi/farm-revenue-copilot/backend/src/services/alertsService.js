'use strict';

/**
 * services/alertsService.js
 *
 * Generates, deduplicates, and persists farmer alerts.
 * Sources:
 *   - NPK / soil nutrient levels from crop_health_daily
 *   - Irrigation need from irrigationService.computeWaterBalance()
 *   - Crop state from crop_state_snapshots (pest, disease, etc.)
 *
 * Deduplication rule:
 *   No duplicate alert of the same type for the same farmer+crop within the
 *   cooldown window defined per alert type.
 */

const db = require('../models/db');
const irrigationService = require('./irrigationService');
const {
  CROP_NPK_RANGES,
  identifyDeficiencies,
  getDeficiencyRecommendation,
} = require('../config/fertilizerReference');

// ── Cooldown windows (one alert per type per farmer+crop per window) ──────────
const COOLDOWN_HOURS = {
  npk_nitrogen:   48,
  npk_phosphorus: 48,
  npk_potassium:  48,
  irrigation:     24,
  pest:           36,
  disease:        24,
  storm:          12,
  general:        24,
};

// ── NPK deficiency thresholds (kg/ha available in soil) ──────────────────────
// These come from crop-specific ranges in fertilizerReference.js (N[0], P[0], K[0] are minimums)
// We flag when value falls below DEFICIENCY_FRACTION of the minimum recommended range.
const DEFICIENCY_FRACTION = 0.70; // Alert at 70% of minimum → catches early deficiency

/**
 * Evaluate a single crop's conditions and upsert alerts as needed.
 *
 * @param {object} params
 * @param {string} params.farmerId
 * @param {string} params.cropId
 * @param {string} params.cropType
 * @param {object|null} params.healthDaily  - Latest crop_health_daily row (may be null)
 * @param {object|null} params.snapshot     - Latest crop_state_snapshots row (may be null)
 * @returns {Promise<number>} - Number of new alerts created
 */
async function evaluateAndUpsertAlerts({ farmerId, cropId, cropType, healthDaily, snapshot }) {
  let created = 0;

  // ── 1. NPK alerts from crop_health_daily ────────────────────────────────────
  if (healthDaily) {
    const npkAlerts = await _checkNPKAlerts(farmerId, cropId, cropType, healthDaily);
    created += npkAlerts;
  }

  // ── 2. Irrigation alert ─────────────────────────────────────────────────────
  if (snapshot && snapshot.computed_at) {
    const irrigationAlerts = await _checkIrrigationAlert(farmerId, cropId, cropType);
    created += irrigationAlerts;
  }

  // ── 3. Pest pressure alert from snapshot ────────────────────────────────────
  if (snapshot && snapshot.pest_pressure_score !== null) {
    const pestAlerts = await _checkPestAlert(farmerId, cropId, cropType, snapshot);
    created += pestAlerts;
  }

  return created;
}

/**
 * Check NPK levels and generate alerts for deficiencies.
 * @private
 */
async function _checkNPKAlerts(farmerId, cropId, cropType, healthDaily) {
  let created = 0;

  const npkRange = CROP_NPK_RANGES[cropType?.toLowerCase()] || CROP_NPK_RANGES.wheat;

  const nutrients = [
    {
      key: 'npk_nitrogen',
      fieldName: 'nitrogen_level',
      value: healthDaily.nitrogen_level,
      nutrientLabel: 'Nitrogen (N)',
      minRequired: npkRange ? npkRange.N[0] * DEFICIENCY_FRACTION : 60,
      healthyRange: npkRange ? `${npkRange.N[0]}–${npkRange.N[1]} kg/acre` : '100–120 kg/acre',
    },
    {
      key: 'npk_phosphorus',
      fieldName: 'phosphorus_level',
      value: healthDaily.phosphorus_level,
      nutrientLabel: 'Phosphorus (P)',
      minRequired: npkRange ? npkRange.P[0] * DEFICIENCY_FRACTION : 28,
      healthyRange: npkRange ? `${npkRange.P[0]}–${npkRange.P[1]} kg/acre` : '40–60 kg/acre',
    },
    {
      key: 'npk_potassium',
      fieldName: 'potassium_level',
      value: healthDaily.potassium_level,
      nutrientLabel: 'Potassium (K)',
      minRequired: npkRange ? npkRange.K[0] * DEFICIENCY_FRACTION : 21,
      healthyRange: npkRange ? `${npkRange.K[0]}–${npkRange.K[1]} kg/acre` : '30–40 kg/acre',
    },
  ];

  for (const nutrient of nutrients) {
    // Skip if sensor data is not available
    if (nutrient.value === null || nutrient.value === undefined) continue;

    if (nutrient.value < nutrient.minRequired) {
      // Determine severity based on how far below threshold
      const pctBelow = ((nutrient.minRequired - nutrient.value) / nutrient.minRequired) * 100;
      const severity = pctBelow >= 40 ? 'high' : pctBelow >= 20 ? 'medium' : 'low';

      const recInfo = getDeficiencyRecommendation(
        nutrient.key.replace('npk_', '')
      );
      const fertNames = recInfo
        ? recInfo.fertilizers.map(f => f.name).slice(0, 2).join(' or ')
        : 'appropriate fertilizer';

      const ok = await _upsertAlert({
        farmerId,
        cropId,
        type: nutrient.key,
        severity,
        title: `Low ${nutrient.nutrientLabel} in ${cropType || 'crop'}`,
        message:
          `${nutrient.nutrientLabel} level is ${nutrient.value.toFixed(1)} kg/acre — ` +
          `below the recommended ${nutrient.healthyRange}. ` +
          `Apply ${fertNames} to prevent yield loss.`,
        data: {
          nutrient: nutrient.nutrientLabel,
          currentValue: nutrient.value,
          healthyRange: nutrient.healthyRange,
          pctBelow: Math.round(pctBelow),
          recommendedFertilizer: recInfo?.fertilizers?.[0] || null,
        },
        cooldownHours: COOLDOWN_HOURS[nutrient.key],
      });

      if (ok) created++;
    }
  }

  return created;
}

/**
 * Check irrigation need via water-balance model and generate alert.
 * @private
 */
async function _checkIrrigationAlert(farmerId, cropId, cropType) {
  try {
    const waterBalance = await irrigationService.computeWaterBalance(cropId);

    if (!waterBalance.recommend_irrigation) return 0;

    const deficitMm = waterBalance.deficit_mm;
    const severity = deficitMm > 30 ? 'high' : deficitMm > 15 ? 'medium' : 'low';
    const suggestedMm = waterBalance.suggested_amount_mm;

    const ok = await _upsertAlert({
      farmerId,
      cropId,
      type: 'irrigation',
      severity,
      title: `Irrigation required for ${cropType || 'your crop'}`,
      message:
        `Water deficit of ${deficitMm.toFixed(1)} mm detected. ` +
        `Apply ${suggestedMm} mm of water. ` +
        `Current soil moisture: ${waterBalance.current_soil_moisture_pct?.toFixed(0) ?? '?'}%. ` +
        `Forecast rain: ${waterBalance.forecast_rainfall_mm?.toFixed(1) ?? '0'} mm (insufficient).`,
      data: {
        deficitMm,
        suggestedAmountMm: suggestedMm,
        currentMoisturePct: waterBalance.current_soil_moisture_pct,
        forecastRainfallMm: waterBalance.forecast_rainfall_mm,
        dailyRequirementMm: waterBalance.daily_water_requirement_mm,
      },
      cooldownHours: COOLDOWN_HOURS.irrigation,
    });

    return ok ? 1 : 0;
  } catch (err) {
    console.error('[alertsService] Irrigation check failed:', err.message);
    return 0;
  }
}

/**
 * Check pest pressure and generate alert if below threshold.
 * @private
 */
async function _checkPestAlert(farmerId, cropId, cropType, snapshot) {
  const PEST_THRESHOLD = 65; // Below this score = pest problem
  if (snapshot.pest_pressure_score >= PEST_THRESHOLD) return 0;

  const score = snapshot.pest_pressure_score;
  const pctBelow = ((PEST_THRESHOLD - score) / PEST_THRESHOLD) * 100;
  const severity = pctBelow >= 30 ? 'high' : pctBelow >= 15 ? 'medium' : 'low';

  const ok = await _upsertAlert({
    farmerId,
    cropId,
    type: 'pest',
    severity,
    title: `Pest pressure detected in ${cropType || 'crop'}`,
    message:
      `Pest pressure score is ${score.toFixed(0)} (threshold: ${PEST_THRESHOLD}). ` +
      `Scout your field immediately and apply appropriate pest control if infestation is confirmed.`,
    data: { pestScore: score, threshold: PEST_THRESHOLD },
    cooldownHours: COOLDOWN_HOURS.pest,
  });

  return ok ? 1 : 0;
}

/**
 * Create an alert only if no duplicate exists within the cooldown window.
 * Returns true if a new alert was inserted.
 * @private
 */
async function _upsertAlert({ farmerId, cropId, type, severity, title, message, data, cooldownHours }) {
  // Check for recent duplicate
  const existing = await db.query(
    `SELECT id FROM farmer_alerts
     WHERE farmer_id = $1
       AND crop_id   = $2
       AND type      = $3
       AND created_at > NOW() - ($4 || ' hours')::INTERVAL
     LIMIT 1`,
    [farmerId, cropId, type, cooldownHours]
  );

  if (existing.rows.length > 0) {
    console.log(
      `[alertsService] Skipping duplicate ${type} alert for farmer ${farmerId} / crop ${cropId}`
    );
    return false;
  }

  // Set expiry (alerts expire after 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    `INSERT INTO farmer_alerts
       (farmer_id, crop_id, type, severity, title, message, data, is_read, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), $8)`,
    [farmerId, cropId, type, severity, title, message, JSON.stringify(data || {}), expiresAt]
  );

  console.log(
    `[alertsService] Created ${severity} ${type} alert for farmer ${farmerId}`
  );
  return true;
}

/**
 * Run full alerts evaluation for all active farmers / crops.
 * Called by alertJob.js after cropStateJob completes.
 */
async function runFullEvaluation() {
  console.log('[alertsService] Starting full alerts evaluation...');

  // Fetch all active crops with their latest health data and snapshots
  const result = await db.query(
    `SELECT
       c.id            AS crop_id,
       c.crop_type,
       c.farmer_id,
       -- Latest health daily
       chd.nitrogen_level,
       chd.phosphorus_level,
       chd.potassium_level,
       chd.health_score,
       chd.moisture_pct,
       chd.date         AS health_date,
       -- Latest snapshot
       css.score,
       css.soil_moisture_pct,
       css.pest_pressure_score,
       css.leaf_color_score,
       css.growth_stage_pct,
       css.data_quality,
       css.computed_at
     FROM crops c
     LEFT JOIN LATERAL (
       SELECT * FROM crop_health_daily
       WHERE crop_id = c.id
       ORDER BY date DESC
       LIMIT 1
     ) chd ON true
     LEFT JOIN LATERAL (
       SELECT * FROM crop_state_snapshots
       WHERE crop_id = c.id
       ORDER BY computed_at DESC
       LIMIT 1
     ) css ON true
     WHERE c.status = 'active'`,
    []
  );

  let totalCreated = 0;

  for (const row of result.rows) {
    try {
      const healthDaily = row.health_date
        ? {
            nitrogen_level: row.nitrogen_level,
            phosphorus_level: row.phosphorus_level,
            potassium_level: row.potassium_level,
            health_score: row.health_score,
            moisture_pct: row.moisture_pct,
          }
        : null;

      const snapshot = row.computed_at
        ? {
            score: row.score,
            soil_moisture_pct: row.soil_moisture_pct,
            pest_pressure_score: row.pest_pressure_score,
            leaf_color_score: row.leaf_color_score,
            growth_stage_pct: row.growth_stage_pct,
            data_quality: row.data_quality,
            computed_at: row.computed_at,
          }
        : null;

      const n = await evaluateAndUpsertAlerts({
        farmerId: row.farmer_id,
        cropId: row.crop_id,
        cropType: row.crop_type,
        healthDaily,
        snapshot,
      });
      totalCreated += n;
    } catch (err) {
      console.error(
        `[alertsService] Error evaluating crop ${row.crop_id}:`,
        err.message
      );
    }
  }

  console.log(`[alertsService] Done. Created ${totalCreated} new alerts.`);
  return totalCreated;
}

module.exports = {
  evaluateAndUpsertAlerts,
  runFullEvaluation,
};
