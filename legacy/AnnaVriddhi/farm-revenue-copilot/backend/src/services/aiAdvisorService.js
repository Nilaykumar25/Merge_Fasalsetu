'use strict';

/**
 * services/aiAdvisorService.js
 * Service layer for AI-powered farmer advisory.
 * Gathers context and routes queries to Gemini.
 */

const db = require('../models/db');
const geminiClient = require('../integrations/geminiClient');

// In-memory conversation history (keyed by farmerId)
// For production, consider using Redis or database table
const conversationCache = new Map();

// Max conversation history to keep per farmer
const MAX_HISTORY_LENGTH = 5;

/**
 * Build context for a farmer's query.
 * Gathers crop data, condition, recommendations, grading, and eligible schemes.
 * 
 * @param {string} farmerId - UUID of the farmer
 * @returns {Promise<object>} - Context object
 */
async function buildContext(farmerId) {
  const context = {
    crop: null,
    condition: null,
    recent_recommendations: [],
    latest_grade: null,
    eligible_schemes: [],
  };

  try {
    // Get farmer's most recent active crop
    const cropResult = await db.query(
      `SELECT * FROM crops 
       WHERE farmer_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [farmerId]
    );

    if (cropResult.rows.length === 0) {
      console.log(`[aiAdvisorService] No active crops found for farmer ${farmerId}`);
      return context; // Return empty context
    }

    const crop = cropResult.rows[0];
    context.crop = crop;

    // Get latest crop condition snapshot
    const conditionResult = await db.query(
      `SELECT * FROM crop_state_snapshots
       WHERE crop_id = $1
       ORDER BY computed_at DESC
       LIMIT 1`,
      [crop.id]
    );

    if (conditionResult.rows.length > 0) {
      context.condition = conditionResult.rows[0];
    }

    // Get recent recommendations
    const recommendationsResult = await db.query(
      `SELECT * FROM recommendation_events
       WHERE crop_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [crop.id]
    );

    context.recent_recommendations = recommendationsResult.rows;

    // Get latest grading
    const gradingResult = await db.query(
      `SELECT * FROM grading_events
       WHERE crop_id = $1
       ORDER BY graded_at DESC
       LIMIT 1`,
      [crop.id]
    );

    if (gradingResult.rows.length > 0) {
      context.latest_grade = gradingResult.rows[0];
    }

    // Get eligible schemes
    const farmerResult = await db.query(
      'SELECT state, land_area_ac FROM farmers WHERE id = $1',
      [farmerId]
    );

    if (farmerResult.rows.length > 0) {
      const { state, land_area_ac } = farmerResult.rows[0];
      const cropType = crop.crop_type;

      // Query schemes - match state, crop, and land size
      const schemesResult = await db.query(
        `SELECT * FROM schemes
         WHERE status = 'ACTIVE'
           AND (state = $1 OR state IS NULL OR level = 'CENTRAL')
           AND (crop_applicability IS NULL OR $2 = ANY(crop_applicability))
           AND (land_size_min_ac IS NULL OR $3 >= land_size_min_ac)
           AND (land_size_max_ac IS NULL OR $3 <= land_size_max_ac)
           AND (application_window_end IS NULL OR application_window_end >= CURRENT_DATE)
         ORDER BY benefit_amount DESC NULLS LAST
         LIMIT 5`,
        [state, cropType, land_area_ac]
      );

      context.eligible_schemes = schemesResult.rows;
    }

    console.log(
      `[aiAdvisorService] Built context for farmer ${farmerId}: ` +
      `crop=${crop.crop_type}, recommendations=${context.recent_recommendations.length}, ` +
      `schemes=${context.eligible_schemes.length}`
    );

  } catch (err) {
    console.error('[aiAdvisorService] Error building context:', err.message);
  }

  return context;
}

/**
 * Handle a farmer's query.
 * Builds context, retrieves conversation history, calls Gemini, and stores exchange.
 * 
 * @param {string} farmerId - UUID of the farmer
 * @param {string} queryText - The farmer's question
 * @returns {Promise<string>} - AI response text
 */
async function handleQuery(farmerId, queryText) {
  try {
    console.log(`[aiAdvisorService] Handling query for farmer ${farmerId}: ${queryText}`);

    // Build context
    const context = await buildContext(farmerId);

    // Get conversation history
    const conversationHistory = conversationCache.get(farmerId) || [];

    // Call Gemini
    const response = await geminiClient.askAdvisor(
      farmerId,
      queryText,
      context,
      conversationHistory
    );

    // Store this exchange in conversation history
    const exchange = {
      query: queryText,
      response: response,
      timestamp: new Date(),
    };

    conversationHistory.push(exchange);

    // Keep only last N exchanges
    if (conversationHistory.length > MAX_HISTORY_LENGTH) {
      conversationHistory.shift();
    }

    conversationCache.set(farmerId, conversationHistory);

    // Optional: Persist to database for analytics
    try {
      await db.query(
        `INSERT INTO advisor_conversations (farmer_id, query, response)
         VALUES ($1, $2, $3)`,
        [farmerId, queryText, response]
      );
    } catch (dbErr) {
      // Table might not exist yet - non-critical
      console.warn('[aiAdvisorService] Could not log conversation to DB:', dbErr.message);
    }

    return response;

  } catch (err) {
    console.error('[aiAdvisorService] Error handling query:', err.message);
    return 'क्षमा करें, तकनीकी समस्या के कारण मैं अभी आपकी मदद नहीं कर सकता। कृपया बाद में फिर कोशिश करें।\n\nSorry, I cannot help due to technical issues. Please try again later.';
  }
}

/**
 * Clear conversation history for a farmer (for testing or privacy).
 * @param {string} farmerId - UUID of the farmer
 */
function clearHistory(farmerId) {
  conversationCache.delete(farmerId);
  console.log(`[aiAdvisorService] Cleared conversation history for farmer ${farmerId}`);
}

module.exports = {
  buildContext,
  handleQuery,
  clearHistory,
};
