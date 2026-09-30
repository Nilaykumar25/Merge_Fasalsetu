'use strict';

/**
 * routes/webhooks.js
 * Webhook endpoints for external services (Twilio, WhatsApp, etc.)
 */

const { Router } = require('express');
const { handleReply } = require('../integrations/smsWhatsapp');

const router = Router();

/**
 * POST /api/webhooks/sms
 * Webhook for incoming SMS/WhatsApp replies from Twilio.
 * 
 * Twilio sends these parameters:
 * - From: Sender's phone number (E.164 format)
 * - To: Your Twilio number
 * - Body: Message text
 * - MessageSid: Unique message ID
 * 
 * For testing without Twilio:
 * POST { "From": "+919876543210", "Body": "YES" }
 */
router.post('/sms', async (req, res, next) => {
  try {
    const { From, Body, MessageSid } = req.body;
    
    // Validate required fields
    if (!From || !Body) {
      return res.status(400).json({ 
        error: 'Missing required fields: From, Body',
        received: req.body,
      });
    }
    
    console.log(`[webhook/sms] Received message from ${From}: "${Body}" (${MessageSid})`);
    
    // Handle the reply
    const updated = await handleReply(From, Body);
    
    if (updated) {
      console.log(
        `[webhook/sms] Updated recommendation ${updated.id}: ` +
        `${updated.status} - ${updated.action_taken}`
      );
      
      // Respond to Twilio (TwiML format for SMS acknowledgment)
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you! Your response has been recorded.</Message>
</Response>`);
    } else {
      console.log(`[webhook/sms] No pending recommendation found for ${From}`);
      
      // Respond to Twilio
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>No pending recommendations to update. Reply to a recommendation message to take action.</Message>
</Response>`);
    }
  } catch (err) {
    console.error('[webhook/sms] Error processing webhook:', err);
    
    // Still send 200 to Twilio to prevent retries
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Error processing your response. Please try again later.</Message>
</Response>`);
  }
});

/**
 * POST /api/webhooks/whatsapp
 * Webhook for incoming WhatsApp messages from Twilio.
 * Same format as SMS webhook.
 */
router.post('/whatsapp', async (req, res, next) => {
  try {
    const { From, Body, MessageSid } = req.body;
    
    if (!From || !Body) {
      return res.status(400).json({ 
        error: 'Missing required fields: From, Body' 
      });
    }
    
    // Remove 'whatsapp:' prefix if present
    const cleanPhone = From.replace('whatsapp:', '');
    
    console.log(`[webhook/whatsapp] Received message from ${cleanPhone}: "${Body}" (${MessageSid})`);
    
    const updated = await handleReply(cleanPhone, Body);
    
    if (updated) {
      console.log(
        `[webhook/whatsapp] Updated recommendation ${updated.id}: ${updated.status}`
      );
      
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>धन्यवाद! आपकी प्रतिक्रिया दर्ज की गई है।</Message>
</Response>`);
    } else {
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>कोई लंबित सिफारिश नहीं मिली।</Message>
</Response>`);
    }
  } catch (err) {
    console.error('[webhook/whatsapp] Error processing webhook:', err);
    
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।</Message>
</Response>`);
  }
});

/**
 * GET /api/webhooks/status
 * Health check endpoint for webhook configuration.
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    webhooks: {
      sms: '/api/webhooks/sms',
      whatsapp: '/api/webhooks/whatsapp',
    },
    instructions: {
      twilio_sms: 'Configure at: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming',
      twilio_whatsapp: 'Configure at: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox',
      local_testing: 'Use ngrok: ngrok http 4000',
    },
  });
});

module.exports = router;
