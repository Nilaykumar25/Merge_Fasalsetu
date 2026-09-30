/**
 * Decision Engine API Routes
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const decisionEngine = require('../services/decisionEngine');
const geminiService = require('../services/geminiService');

const router = express.Router();

/**
 * POST /api/decisions/generate
 * Generate comprehensive farm decisions
 */
router.post('/generate',
  [
    body('farmId').notEmpty().withMessage('farmId is required'),
    body('cropId').notEmpty().withMessage('cropId is required'),
    body('crop').notEmpty().withMessage('crop type is required'),
    body('growthStage').optional(),
    body('sensorData').optional().isObject(),
    body('cropHealthData').optional().isObject(),
    body('location').optional().isObject(),
    body('language').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const decisions = await decisionEngine.generateDecisions(req.body);
      res.json(decisions);
    } catch (err) {
      console.error('[Decisions API] Error generating decisions:', err);
      res.status(500).json({ 
        error: 'Failed to generate decisions',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/decisions/dashboard/:farmId
 * Get dashboard overview for a farm
 */
router.get('/dashboard/:farmId',
  [
    query('language').optional().isString()
  ],
  async (req, res) => {
    try {
      const { farmId } = req.params;
      const language = req.query.language || 'en';
      
      const dashboard = await decisionEngine.getDashboardOverview(farmId, language);
      res.json(dashboard);
    } catch (err) {
      console.error('[Decisions API] Error fetching dashboard:', err);
      res.status(500).json({ 
        error: 'Failed to fetch dashboard',
        message: err.message 
      });
    }
  }
);

/**
 * POST /api/decisions/localize
 * Localize decisions to target language
 */
router.post('/localize',
  [
    body('summary').notEmpty(),
    body('decisions').isArray(),
    body('language').notEmpty(),
    body('crop').optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const localized = await geminiService.localizeDecisions(req.body);
      res.json(localized);
    } catch (err) {
      console.error('[Decisions API] Error localizing:', err);
      res.status(500).json({ 
        error: 'Failed to localize decisions',
        message: err.message 
      });
    }
  }
);

/**
 * POST /api/decisions/message
 * Generate SMS/WhatsApp message from decision
 */
router.post('/message',
  [
    body('decision').notEmpty().isObject(),
    body('language').optional().isString(),
    body('farmerName').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { decision, language = 'hi', farmerName } = req.body;
      const message = await geminiService.generateMessage(decision, language, farmerName);
      res.json({ message });
    } catch (err) {
      console.error('[Decisions API] Error generating message:', err);
      res.status(500).json({ 
        error: 'Failed to generate message',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/decisions/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
  res.json({
    languages: geminiService.SUPPORTED_LANGUAGES
  });
});

/**
 * GET /api/decisions/test/gemini
 * Test Gemini API connection
 */
router.get('/test/gemini', async (req, res) => {
  try {
    const result = await geminiService.testConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
