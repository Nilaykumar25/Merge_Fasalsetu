'use strict';

/**
 * routes/advisor.js
 * REST API endpoint for AI advisor queries.
 * Allows in-app chat interface in addition to SMS/WhatsApp.
 */

const express = require('express');
const router = express.Router();
const aiAdvisorService = require('../services/aiAdvisorService');

/**
 * POST /advisor/:farmerId
 * Send a query to the AI advisor.
 * 
 * Body: { message: "string" }
 * Response: { query: "string", response: "string" }
 */
router.post('/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'message field is required and must be a non-empty string' 
      });
    }

    const response = await aiAdvisorService.handleQuery(farmerId, message.trim());

    res.json({
      query: message.trim(),
      response: response,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[routes/advisor] Error handling query:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to process your query. Please try again.' 
    });
  }
});

/**
 * DELETE /advisor/:farmerId/history
 * Clear conversation history for a farmer.
 */
router.delete('/:farmerId/history', async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    aiAdvisorService.clearHistory(farmerId);
    
    res.json({ 
      message: 'Conversation history cleared',
      farmerId: farmerId 
    });

  } catch (err) {
    console.error('[routes/advisor] Error clearing history:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to clear history.' 
    });
  }
});

/**
 * GET /advisor/health
 * Health check endpoint.
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-advisor',
    gemini_configured: !!process.env.GEMINI_API_KEY,
  });
});

module.exports = router;
