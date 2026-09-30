'use strict';

/**
 * integrations/smsWhatsapp.js
 * Sends SMS and WhatsApp alerts via Twilio.
 * Wrap all messaging behind this module so the provider can be swapped.
 */

const db = require('../models/db');

// Hindi templates for different recommendation types
const TEMPLATES = {
  irrigation: {
    en: 'Your {crop_type} crop needs irrigation. Apply {suggested_amount}mm. Estimated benefit: ₹{predicted_revenue_impact} ({revenue_impact_pct}% vs no action). Reply YES to confirm.',
    hi: 'आपकी {crop_type} फसल को सिंचाई की जरूरत है। {suggested_amount}mm पानी दें। अनुमानित लाभ: ₹{predicted_revenue_impact} (बिना कार्रवाई से {revenue_impact_pct}% अधिक)। पुष्टि के लिए YES भेजें।',
  },
  fertilizer: {
    en: 'Nutrient deficiency detected in your {crop_type}. Apply fertilizer now. Estimated benefit: ₹{predicted_revenue_impact} ({revenue_impact_pct}% vs no action). Reply YES to confirm.',
    hi: 'आपकी {crop_type} फसल में पोषक तत्वों की कमी है। अभी उर्वरक डालें। अनुमानित लाभ: ₹{predicted_revenue_impact} (बिना कार्रवाई से {revenue_impact_pct}% अधिक)। पुष्टि के लिए YES भेजें।',
  },
  pesticide: {
    en: 'Pest pressure detected in your {crop_type}. Apply pesticide immediately. Estimated benefit: ₹{predicted_revenue_impact} ({revenue_impact_pct}% vs no action). Reply YES to confirm.',
    hi: 'आपकी {crop_type} फसल में कीट का दबाव है। तुरंत कीटनाशक डालें। अनुमानित लाभ: ₹{predicted_revenue_impact} (बिना कार्रवाई से {revenue_impact_pct}% अधिक)। पुष्टि के लिए YES भेजें।',
  },
  cover: {
    en: 'URGENT: Storm warning for your {crop_type} crop. Protect with covers now. Estimated benefit: ₹{predicted_revenue_impact} ({revenue_impact_pct}% vs no action). Reply YES to confirm.',
    hi: 'जरूरी: आपकी {crop_type} फसल के लिए तूफान की चेतावनी। अभी कवर से सुरक्षा करें। अनुमानित लाभ: ₹{predicted_revenue_impact} (बिना कार्रवाई से {revenue_impact_pct}% अधिक)। पुष्टि के लिए YES भेजें।',
  },
  harvest: {
    en: 'Perfect time to harvest your {crop_type}! Weather and quality are optimal. Estimated benefit: ₹{predicted_revenue_impact} ({revenue_impact_pct}% vs delay). Reply YES to confirm.',
    hi: 'आपकी {crop_type} फसल की कटाई का सही समय है! मौसम और गुणवत्ता उत्तम है। अनुमानित लाभ: ₹{predicted_revenue_impact} (देरी से {revenue_impact_pct}% अधिक)। पुष्टि के लिए YES भेजें।',
  },
  scheme: {
    en: 'You are eligible for {scheme_name}. Benefit: ₹{predicted_revenue_impact} ({revenue_impact_pct}%). Apply by {deadline}. Reply YES for details.',
    hi: 'आप {scheme_name} के लिए पात्र हैं। लाभ: ₹{predicted_revenue_impact} ({revenue_impact_pct}%)। {deadline} तक आवेदन करें। विवरण के लिए YES भेजें।',
  },
  do_nothing: {
    en: 'Your {crop_type} crop is in excellent condition. No action needed. (0% change)',
    hi: 'आपकी {crop_type} फसल उत्तम स्थिति में है। कोई कार्रवाई जरूरी नहीं। (0% परिवर्तन)',
  },
};

// Lazy-load Twilio only if credentials are present
function _getClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[smsWhatsapp] Twilio credentials not configured - messages will be logged only');
    return null;
  }
  // eslint-disable-next-line global-require
  return require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * Send a message using a template.
 * @param {string} farmerPhone - E.164 format phone number
 * @param {string} templateKey - Key from TEMPLATES (irrigation, fertilizer, etc.)
 * @param {object} params - Template parameters (crop_type, predicted_revenue_impact, etc.)
 * @param {string} lang - Language code ('en' or 'hi')
 * @returns {Promise<object>} - Twilio message object or mock
 */
async function sendMessage(farmerPhone, templateKey, params = {}, lang = 'hi') {
  const template = TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown template key: ${templateKey}`);
  }
  
  // Get template text in requested language
  let body = template[lang] || template.en;
  
  // Replace parameters
  Object.keys(params).forEach(key => {
    const placeholder = `{${key}}`;
    body = body.replace(placeholder, params[key]);
  });
  
  const client = _getClient();
  
  // If Twilio not configured, just log
  if (!client) {
    console.log(`[smsWhatsapp] Would send to ${farmerPhone}: ${body}`);
    return { 
      sid: 'mock_' + Date.now(), 
      to: farmerPhone, 
      body,
      status: 'mock',
    };
  }
  
  // Send via SMS
  return await sendSms({ to: farmerPhone, body });
}

/**
 * Send a plain SMS.
 * @param {{ to: string, body: string }} params  `to` should be E.164 format
 */
async function sendSms({ to, body }) {
  const client = _getClient();
  
  if (!client) {
    console.log(`[smsWhatsapp] Mock SMS to ${to}: ${body}`);
    return { sid: 'mock_' + Date.now(), to, body, status: 'mock' };
  }
  
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    body,
  });
}

/**
 * Send a WhatsApp message via Twilio WhatsApp sandbox / approved number.
 * @param {{ to: string, body: string }} params  `to` = whatsapp:+91XXXXXXXXXX
 */
async function sendWhatsApp({ to, body }) {
  const client = _getClient();
  
  if (!client) {
    console.log(`[smsWhatsapp] Mock WhatsApp to ${to}: ${body}`);
    return { sid: 'mock_' + Date.now(), to, body, status: 'mock' };
  }
  
  const from = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  const toWA  = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return client.messages.create({ from, to: toWA, body });
}

/**
 * Handle incoming reply from farmer.
 * Matches reply to most recent pending recommendation for that farmer's crops.
 * Updates status and action_taken.
 * If reply doesn't match a pending recommendation pattern, routes to AI Advisor.
 * 
 * @param {string} farmerPhone - E.164 format phone number
 * @param {string} replyText - The farmer's reply message
 * @returns {Promise<object>} - Updated recommendation or AI response
 */
async function handleReply(farmerPhone, replyText) {
  try {
    // Normalize reply text
    const reply = replyText.toLowerCase().trim();
    
    // Determine action based on reply
    let status = 'acknowledged';
    let actionTaken = null;
    
    if (reply === 'yes' || reply === 'हाँ' || reply === 'ha' || reply === 'y') {
      status = 'acted';
      actionTaken = 'Confirmed action taken by farmer';
    } else if (reply === 'no' || reply === 'नहीं' || reply === 'nahi' || reply === 'n') {
      status = 'dismissed';
      actionTaken = 'Farmer declined recommendation';
    } else if (reply.includes('done') || reply.includes('completed') || reply.includes('किया')) {
      status = 'acted';
      actionTaken = 'Farmer confirmed completion';
    } else {
      // Check if this is a question/query rather than a simple acknowledgment
      // If so, route to AI Advisor instead of treating as generic acknowledgment
      const looksLikeQuestion = replyText.includes('?') || 
                                 replyText.includes('कैसे') || 
                                 replyText.includes('क्या') || 
                                 replyText.includes('कब') || 
                                 replyText.includes('how') || 
                                 replyText.includes('what') || 
                                 replyText.includes('when') ||
                                 replyText.split(' ').length > 5; // Long message likely a question
      
      if (looksLikeQuestion) {
        // Route to AI Advisor
        try {
          const aiAdvisorService = require('../services/aiAdvisorService');
          
          // Get farmer ID from phone
          const farmerResult = await db.query(
            'SELECT id FROM farmers WHERE phone = $1 LIMIT 1',
            [farmerPhone]
          );
          
          if (farmerResult.rows.length > 0) {
            const farmerId = farmerResult.rows[0].id;
            const aiResponse = await aiAdvisorService.handleQuery(farmerId, replyText);
            
            // Send AI response back
            await sendSms({ to: farmerPhone, body: aiResponse });
            
            return { 
              type: 'ai_advisor_response', 
              farmerId, 
              query: replyText, 
              response: aiResponse 
            };
          }
        } catch (err) {
          console.error('[smsWhatsapp] Error routing to AI Advisor:', err.message);
          // Fall through to generic acknowledgment
        }
      }
      
      // Generic acknowledgment
      actionTaken = `Farmer replied: ${replyText}`;
    }
    
    // Find most recent pending recommendation for this farmer
    const result = await db.query(
      `UPDATE recommendation_events re
       SET status = $1,
           action_taken = $2,
           action_notes = $3,
           acknowledged_at = NOW()
       FROM crops c
       JOIN farmers f ON f.id = c.farmer_id
       WHERE re.crop_id = c.id
         AND f.phone = $4
         AND re.status = 'pending'
         AND re.id = (
           SELECT re2.id
           FROM recommendation_events re2
           JOIN crops c2 ON c2.id = re2.crop_id
           JOIN farmers f2 ON f2.id = c2.farmer_id
           WHERE f2.phone = $4
             AND re2.status = 'pending'
           ORDER BY re2.created_at DESC
           LIMIT 1
         )
       RETURNING re.*`,
      [status, actionTaken, replyText, farmerPhone]
    );
    
    if (result.rows.length > 0) {
      console.log(
        `[smsWhatsapp] Updated recommendation ${result.rows[0].id} ` +
        `from ${farmerPhone}: ${status}`
      );
      return result.rows[0];
    } else {
      console.log(`[smsWhatsapp] No pending recommendations found for ${farmerPhone}`);
      return null;
    }
    
  } catch (err) {
    console.error('[smsWhatsapp] Error handling reply:', err.message);
    throw err;
  }
}

module.exports = { 
  sendSms, 
  sendWhatsApp, 
  sendMessage,
  handleReply,
  TEMPLATES,
};
