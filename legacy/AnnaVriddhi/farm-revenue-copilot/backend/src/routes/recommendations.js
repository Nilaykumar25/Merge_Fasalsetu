'use strict';

const { Router } = require('express');
const recommendationService = require('../services/recommendationService');
const { handleReply } = require('../integrations/smsWhatsapp');

const router = Router();

/**
 * GET /api/recommendations/:cropId
 * All pending & recent recommendations for a crop.
 */
router.get('/:cropId', async (req, res, next) => {
  try {
    const recs = await recommendationService.getForCrop(req.params.cropId);
    res.json(recs);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/recommendations/:recommendationId/acknowledge
 * Log farmer acknowledgement / action taken.
 * Body: { action, notes? }
 */
router.post('/:recommendationId/acknowledge', async (req, res, next) => {
  try {
    const updated = await recommendationService.acknowledge(
      req.params.recommendationId,
      req.body
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/recommendations/webhook/sms-reply
 * Webhook for incoming SMS/WhatsApp replies from Twilio.
 * Body: { From, Body } (Twilio format)
 */
router.post('/webhook/sms-reply', async (req, res, next) => {
  try {
    const { From, Body } = req.body;
    
    if (!From || !Body) {
      return res.status(400).json({ 
        error: 'Missing required fields: From, Body' 
      });
    }
    
    // Handle the reply
    const updated = await handleReply(From, Body);
    
    if (updated) {
      console.log(`[webhook] Processed reply from ${From}: ${updated.status}`);
      res.json({ 
        success: true, 
        recommendationId: updated.id,
        status: updated.status,
      });
    } else {
      console.log(`[webhook] No pending recommendation found for ${From}`);
      res.json({ 
        success: true, 
        message: 'No pending recommendations to update',
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
