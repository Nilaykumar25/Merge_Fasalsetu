'use strict';

const { Router } = require('express');
const schemesService = require('../services/schemesService');

const router = Router();

/**
 * GET /api/schemes/match
 * 
 * Match schemes based on farmer profile
 * 
 * Query params:
 *   - state (required): State name
 *   - district (optional): District name
 *   - crop (optional): Crop type
 *   - landSize (optional): Land size in acres
 *   - landUnit (optional): acre/hectare
 *   - season (optional): Kharif/Rabi/Zaid
 *   - activity (optional): BUY_EQUIPMENT, BUY_SEED, INSURE_CROP, etc.
 *   - farmerCategory (optional): Small/Marginal/All
 *   - landOwnership (optional): true/false
 *   - estimatedCost (optional): For subsidy calculation
 * 
 * Returns: Matched schemes with eligibility status and relevance scoring
 */
router.get('/match', async (req, res, next) => {
  try {
    // Validate required fields
    if (!req.query.state) {
      return res.status(400).json({ 
        success: false,
        error: 'State is required for scheme matching' 
      });
    }
    
    // Parse query parameters
    const farmerProfile = {
      state: req.query.state,
      district: req.query.district,
      crop: req.query.crop,
      landSize: req.query.landSize ? parseFloat(req.query.landSize) : null,
      landUnit: req.query.landUnit || 'acre',
      season: req.query.season,
      activity: req.query.activity,
      category: req.query.category,
      farmerCategory: req.query.farmerCategory,
      landOwnership: req.query.landOwnership === 'true',
      estimatedCost: req.query.estimatedCost ? parseFloat(req.query.estimatedCost) : null
    };
    
    const result = await schemesService.match(farmerProfile);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/schemes/state/:state
 * 
 * Get all schemes available in a specific state
 * Includes both central and state-specific schemes
 */
router.get('/state/:state', async (req, res, next) => {
  try {
    const schemes = await schemesService.getByState(req.params.state);
    res.json({ 
      success: true,
      state: req.params.state,
      count: schemes.length,
      schemes 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/schemes/category/:category
 * 
 * Get all schemes in a specific category
 * Categories: INCOME_SUPPORT, CROP_INSURANCE, AGRICULTURAL_CREDIT, etc.
 */
router.get('/category/:category', async (req, res, next) => {
  try {
    const schemes = await schemesService.getByCategory(req.params.category);
    res.json({ 
      success: true,
      category: req.params.category,
      count: schemes.length,
      schemes 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/schemes/:schemeId
 * 
 * Get full details for a single scheme
 */
router.get('/:schemeId', async (req, res, next) => {
  try {
    const scheme = await schemesService.getById(req.params.schemeId);
    
    if (!scheme) {
      return res.status(404).json({ 
        success: false,
        error: 'Scheme not found' 
      });
    }
    
    res.json({ 
      success: true,
      scheme 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
