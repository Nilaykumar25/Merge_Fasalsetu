'use strict';

const { Router } = require('express');
const irrigationService = require('../services/irrigationService');

const router = Router();

/**
 * GET /api/irrigation/:cropId
 * Returns current water balance prediction and irrigation history.
 */
router.get('/:cropId', async (req, res, next) => {
  try {
    const schedule = await irrigationService.getSchedule(req.params.cropId);
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/irrigation/:cropId/schedule
 * Returns the current irrigation schedule and next recommended action.
 * (Legacy endpoint - redirects to main GET endpoint)
 */
router.get('/:cropId/schedule', async (req, res, next) => {
  try {
    const schedule = await irrigationService.getSchedule(req.params.cropId);
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/irrigation/:cropId
 * Log a completed irrigation event.
 * Body: { date?, amountMm, method?, notes? }
 */
router.post('/:cropId', async (req, res, next) => {
  try {
    const { date, amountMm, method, notes } = req.body;
    
    // Validate required fields
    if (!amountMm || amountMm <= 0) {
      return res.status(400).json({ 
        error: 'amountMm is required and must be positive' 
      });
    }
    
    const event = await irrigationService.logEvent(req.params.cropId, {
      date,
      amountMm,
      method,
      notes,
    });
    
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/irrigation/:cropId/log
 * Log a completed irrigation event.
 * (Legacy endpoint - redirects to main POST endpoint)
 */
router.post('/:cropId/log', async (req, res, next) => {
  try {
    const { date, amountMm, method, notes } = req.body;
    
    if (!amountMm || amountMm <= 0) {
      return res.status(400).json({ 
        error: 'amountMm is required and must be positive' 
      });
    }
    
    const event = await irrigationService.logEvent(req.params.cropId, {
      date,
      amountMm,
      method,
      notes,
    });
    
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
