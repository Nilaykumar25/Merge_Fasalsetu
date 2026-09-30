'use strict';

/**
 * routes/cropWrapped.js
 * Crop Wrapped API - Personalized seasonal farm review
 */

const { Router } = require('express');
const cropWrappedService = require('../services/cropWrappedService');
const { authenticate } = require('../middleware/auth');

const router = Router();

/**
 * GET /api/crop-wrapped/:cropId
 * Get Crop Wrapped report for a specific season (crop)
 * 
 * Authentication: Requires farmerId via Authorization header or X-Farmer-Id header
 * 
 * Returns complete seasonal summary including:
 * - Season overview
 * - Recommendation adherence
 * - Disease summary
 * - Financial comparison
 * - Season score
 * - Insights and next season recommendations
 */
router.get('/:cropId', authenticate, async (req, res, next) => {
  try {
    const { cropId } = req.params;
    const farmerId = req.farmer.id;
    
    const report = await cropWrappedService.generateCropWrapped(cropId, farmerId);
    
    res.json(report);
  } catch (err) {
    if (err.message === 'SEASON_NOT_FOUND') {
      return res.status(404).json({
        error: 'Season not found',
        message: 'No crop found with the provided ID',
      });
    }
    
    if (err.message === 'UNAUTHORIZED') {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You do not have access to this season',
      });
    }
    
    next(err);
  }
});

/**
 * POST /api/crop-wrapped/actions
 * Log a farmer action for a recommendation
 * 
 * Body:
 * {
 *   recommendationId: "uuid",
 *   cropId: "uuid",
 *   followed: "FOLLOWED" | "NOT_FOLLOWED" | "UNKNOWN",
 *   actionDetail: "optional description"
 * }
 */
router.post('/actions', authenticate, async (req, res, next) => {
  try {
    const { recommendationId, cropId, followed, actionDetail } = req.body;
    const farmerId = req.farmer.id;
    
    // Validate required fields
    if (!recommendationId || !cropId || !followed) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'recommendationId, cropId, and followed are required',
      });
    }
    
    // Validate followed value
    const validFollowedValues = ['FOLLOWED', 'NOT_FOLLOWED', 'UNKNOWN'];
    if (!validFollowedValues.includes(followed)) {
      return res.status(400).json({
        error: 'Invalid followed value',
        message: 'followed must be one of: FOLLOWED, NOT_FOLLOWED, UNKNOWN',
      });
    }
    
    // Verify recommendation exists and belongs to farmer's crop
    const db = require('../models/db');
    const recCheck = await db.query(
      `SELECT re.id, c.farmer_id
       FROM recommendation_events re
       JOIN crops c ON c.id = re.crop_id
       WHERE re.id = $1 AND re.crop_id = $2`,
      [recommendationId, cropId]
    );
    
    if (recCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Recommendation not found',
        message: 'No recommendation found for the provided IDs',
      });
    }
    
    if (recCheck.rows[0].farmer_id !== farmerId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You do not have access to this recommendation',
      });
    }
    
    // Insert farmer action
    const result = await db.query(
      `INSERT INTO farmer_actions 
        (recommendation_id, farmer_id, crop_id, followed, action_detail)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [recommendationId, farmerId, cropId, followed, actionDetail || null]
    );
    
    res.status(201).json({
      success: true,
      action: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/crop-wrapped/farmer/:farmerId/seasons
 * Get all seasons (crops) for a farmer
 * 
 * Useful for listing available Crop Wrapped reports
 */
router.get('/farmer/:requestedFarmerId/seasons', authenticate, async (req, res, next) => {
  try {
    const { requestedFarmerId } = req.params;
    const authenticatedFarmerId = req.farmer.id;
    
    // Farmers can only access their own seasons
    if (requestedFarmerId !== authenticatedFarmerId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You can only access your own seasons',
      });
    }
    
    const db = require('../models/db');
    const result = await db.query(
      `SELECT 
        c.id,
        c.crop_type,
        c.variety,
        c.sow_date,
        c.expected_harvest_date,
        c.completed_at,
        c.status,
        c.season_name
       FROM crops c
       WHERE c.farmer_id = $1
       ORDER BY c.sow_date DESC`,
      [authenticatedFarmerId]
    );
    
    res.json({
      success: true,
      seasons: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
