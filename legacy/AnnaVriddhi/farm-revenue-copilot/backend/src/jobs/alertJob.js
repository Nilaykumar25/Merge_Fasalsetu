'use strict';

/**
 * jobs/alertJob.js
 * Scheduled job — evaluates crop conditions against thresholds and weather,
 * generates recommendations, estimates revenue impact, and dispatches alerts.
 *
 * Runs after cropStateJob (or triggered by it).
 */

const db = require('../models/db');
const recommendationService = require('../services/recommendationService');
const revenueService = require('../services/revenueService');
const weatherApi = require('../integrations/weatherApi');
const { sendMessage } = require('../integrations/smsWhatsapp');
const alertsService = require('../services/alertsService');

// Default coordinates for weather (can be overridden per farmer/location)
const DEFAULT_LAT = 18.5204; // Pune, Maharashtra
const DEFAULT_LON = 73.8567;

/**
 * Main entry point — called by the scheduler after cropStateJob.
 */
async function run() {
  console.log('[alertJob] Starting recommendation evaluation…');

  try {
    // Fetch all active crops with their latest snapshots
    const result = await db.query(
      `SELECT 
        c.id as crop_id,
        c.crop_type,
        c.farmer_id,
        f.phone as farmer_phone,
        f.name as farmer_name,
        css.score,
        css.soil_moisture_pct,
        css.leaf_color_score,
        css.pest_pressure_score,
        css.growth_stage_pct,
        css.data_quality,
        css.computed_at
       FROM crops c
       JOIN farmers f ON f.id = c.farmer_id
       LEFT JOIN LATERAL (
         SELECT * FROM crop_state_snapshots
         WHERE crop_id = c.id
         ORDER BY computed_at DESC
         LIMIT 1
       ) css ON true
       WHERE c.status = 'active'
       ORDER BY css.computed_at DESC NULLS LAST`,
      []
    );

    const crops = result.rows;
    console.log(`[alertJob] Found ${crops.length} active crops to evaluate`);

    let recommendationCount = 0;
    let alertsSentCount = 0;

    for (const crop of crops) {
      try {
        await processOneCrop(crop);
        recommendationCount++;
      } catch (err) {
        console.error(`[alertJob] Error processing crop ${crop.crop_id}:`, err.message);
      }
    }

    console.log(
      `[alertJob] Done. Processed ${recommendationCount} crops, ` +
      `sent ${alertsSentCount} alerts.`
    );

    // Run structured farmer_alerts evaluation (NPK, irrigation, pest)
    try {
      await alertsService.runFullEvaluation();
    } catch (err) {
      console.error('[alertJob] alertsService evaluation failed:', err.message);
    }
  } catch (err) {
    console.error('[alertJob] Fatal error:', err);
    throw err;
  }
}

/**
 * Process a single crop: fetch weather, evaluate, estimate impact, save, notify.
 * @param {object} crop - Crop with latest snapshot data
 */
async function processOneCrop(crop) {
  const { 
    crop_id, 
    crop_type, 
    farmer_id,
    farmer_phone, 
    farmer_name,
  } = crop;

  // Check if snapshot exists
  if (!crop.computed_at) {
    console.log(`[alertJob] No snapshot found for crop ${crop_id}, skipping`);
    return;
  }

  // Extract snapshot data
  const snapshot = {
    score: crop.score,
    soil_moisture_pct: crop.soil_moisture_pct,
    leaf_color_score: crop.leaf_color_score,
    pest_pressure_score: crop.pest_pressure_score,
    growth_stage_pct: crop.growth_stage_pct,
    data_quality: crop.data_quality,
    computed_at: crop.computed_at,
  };

  // Skip if data quality is too poor
  if (snapshot.data_quality === 'partial' && 
      !snapshot.soil_moisture_pct && 
      !snapshot.leaf_color_score && 
      !snapshot.pest_pressure_score) {
    console.log(
      `[alertJob] Snapshot for crop ${crop_id} has insufficient data, skipping`
    );
    return;
  }

  // Fetch weather forecast
  // TODO: Get actual farmer location coordinates from database
  const weather = await weatherApi.fetchWeather(DEFAULT_LAT, DEFAULT_LON);

  // Evaluate conditions and get recommendation
  const recommendation = await recommendationService.evaluate(
    crop_id,
    snapshot,
    weather,
    crop_type
  );

  // Estimate revenue impact (both ₹ and %)
  const impactEstimate = await revenueService.estimateImpact(
    crop_id,
    recommendation.type
  );
  
  const predictedImpact = impactEstimate.predicted_revenue_impact || 0;
  const revenueImpactPct = impactEstimate.revenue_impact_pct || 0;

  // Check if similar recommendation already exists recently (avoid spam)
  const recentCheck = await db.query(
    `SELECT id FROM recommendation_events
     WHERE crop_id = $1
       AND type = $2
       AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [crop_id, recommendation.type]
  );

  if (recentCheck.rows.length > 0 && recommendation.type !== 'do_nothing') {
    console.log(
      `[alertJob] Similar ${recommendation.type} recommendation already sent ` +
      `for crop ${crop_id} in last 24h, skipping`
    );
    return;
  }

  // Insert recommendation into database
  const insertResult = await db.query(
    `INSERT INTO recommendation_events 
      (crop_id, type, priority, title, body, status, predicted_revenue_impact, revenue_impact_pct)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
     RETURNING id`,
    [
      crop_id,
      recommendation.type,
      recommendation.priority,
      recommendation.title,
      recommendation.body,
      predictedImpact,
      revenueImpactPct,
    ]
  );

  const recommendationId = insertResult.rows[0].id;

  console.log(
    `[alertJob] Created ${recommendation.type} recommendation for crop ${crop_id} ` +
    `(${crop_type}): priority=${recommendation.priority}, impact=₹${predictedImpact} (${revenueImpactPct}%)`
  );

  // Send notification if action is needed (not do_nothing) and priority is medium/high
  if (recommendation.type !== 'do_nothing' && 
      (recommendation.priority === 'high' || recommendation.priority === 'medium')) {
    
    if (farmer_phone) {
      try {
        await sendMessage(
          farmer_phone,
          recommendation.type,
          {
            crop_type: crop_type || 'crop',
            predicted_revenue_impact: Math.abs(predictedImpact).toFixed(0),
            revenue_impact_pct: revenueImpactPct >= 0 ? '+' + revenueImpactPct.toFixed(1) : revenueImpactPct.toFixed(1),
            suggested_amount: recommendation.body.match(/(\d+)mm/)?.[1] || '', // Extract mm amount if present
          },
          'hi' // Default to Hindi
        );
        
        // Update delivered_at timestamp
        await db.query(
          'UPDATE recommendation_events SET delivered_at = NOW() WHERE id = $1',
          [recommendationId]
        );
        
        console.log(
          `[alertJob] Sent ${recommendation.type} alert to ${farmer_phone} ` +
          `for crop ${crop_id} with ₹${predictedImpact} (${revenueImpactPct}%) impact`
        );
      } catch (err) {
        console.error(
          `[alertJob] Failed to send alert for recommendation ${recommendationId}:`,
          err.message
        );
        // Don't throw - continue processing other crops
      }
    } else {
      console.log(
        `[alertJob] No phone number for farmer ${farmer_id}, ` +
        `recommendation ${recommendationId} created but not sent`
      );
    }
  } else if (recommendation.type === 'do_nothing') {
    // For do_nothing, mark as delivered without sending (informational only)
    await db.query(
      'UPDATE recommendation_events SET delivered_at = NOW() WHERE id = $1',
      [recommendationId]
    );
  }
}

module.exports = { run, processOneCrop };
