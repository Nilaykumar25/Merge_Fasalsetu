/**
 * Gemini Localization Service
 * Translates agricultural recommendations into local languages
 */

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Supported languages
const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  te: 'Telugu',
  ta: 'Tamil',
  kn: 'Kannada',
  gu: 'Gujarati',
  pa: 'Punjabi',
  bn: 'Bengali'
};

/**
 * Localize decisions to target language
 * @param {Object} params
 * @param {string} params.summary - Summary text
 * @param {Array} params.decisions - Array of decision objects
 * @param {string} params.language - Target language code
 * @param {string} params.crop - Crop name
 * @returns {Promise<Object>} Localized content
 */
async function localizeDecisions(params) {
  const { summary, decisions, language, crop } = params;

  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] API key not configured, skipping localization');
    return { summary, decisions };
  }

  const languageName = SUPPORTED_LANGUAGES[language] || language;

  // Prepare structured data for translation
  const content = {
    summary,
    crop,
    decisions: decisions.map(d => ({
      type: d.type,
      severity: d.severity,
      alert: d.alert,
      recommendation: d.recommendation,
      reason: d.reason,
      actions: d.actions || [],
      revenueImpact: d.revenueImpact ? {
        expectedLoss: d.revenueImpact.expectedLoss,
        protectionCost: d.revenueImpact.protectionCost,
        netValue: d.revenueImpact.netValue
      } : null
    }))
  };

  const prompt = `You are an agricultural advisor translating farm recommendations into ${languageName} for small-scale farmers.

Translate the following agricultural recommendations into simple, clear ${languageName}. 

IMPORTANT RULES:
1. Do NOT change any numerical values (dates, percentages, amounts, rupees)
2. Keep all technical recommendations accurate - do not simplify or alter the advice
3. Use simple, farmer-friendly language
4. Maintain the urgency and severity of the original message
5. Keep all currency symbols (₹) and units as-is
6. Translate action items clearly
7. For crop names, use the common ${languageName} term if widely known, otherwise keep scientific name

Input data (JSON format):
${JSON.stringify(content, null, 2)}

Respond with ONLY a JSON object in this exact format:
{
  "summary": "translated summary text",
  "decisions": [
    {
      "type": "keep original value",
      "severity": "keep original value",
      "alert": "translated alert",
      "recommendation": "translated recommendation",
      "reason": "translated reason",
      "actions": ["translated action 1", "translated action 2"],
      "revenueImpact": {
        "expectedLoss": keep original number,
        "protectionCost": keep original number,
        "netValue": keep original number
      }
    }
  ]
}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const candidates = response.data?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const generatedText = candidates[0].content.parts[0].text;
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = generatedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/```\s*$/, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/```\s*$/, '').trim();
    }

    const localized = JSON.parse(jsonText);

    // Merge back with original metadata that shouldn't be translated
    const localizedDecisions = decisions.map((original, i) => ({
      ...original,
      alert: localized.decisions[i]?.alert || original.alert,
      recommendation: localized.decisions[i]?.recommendation || original.recommendation,
      reason: localized.decisions[i]?.reason || original.reason,
      actions: localized.decisions[i]?.actions || original.actions
    }));

    return {
      summary: localized.summary || summary,
      decisions: localizedDecisions
    };

  } catch (err) {
    console.error('[Gemini] Localization failed:', err.message);
    if (err.response) {
      console.error('[Gemini] API response:', err.response.data);
    }
    // Return original content on failure
    return { summary, decisions };
  }
}

/**
 * Generate SMS/WhatsApp message from decision
 * @param {Object} decision - Decision object
 * @param {string} language - Target language
 * @param {string} farmerName - Farmer name (optional)
 * @returns {Promise<string>} Formatted message
 */
async function generateMessage(decision, language = 'hi', farmerName = null) {
  if (!GEMINI_API_KEY) {
    // Fallback to simple English message
    return formatSimpleMessage(decision, farmerName);
  }

  const languageName = SUPPORTED_LANGUAGES[language] || language;
  const greeting = farmerName ? `${farmerName} जी,` : 'किसान भाई,';

  const prompt = `Convert this agricultural alert into a SHORT SMS message in ${languageName} (max 160 characters if possible, max 300 if necessary).

Alert data:
- Type: ${decision.type}
- Severity: ${decision.severity}
- Alert: ${decision.alert}
- Recommendation: ${decision.recommendation}
- Revenue impact: ₹${decision.revenueImpact?.netValue || 0}

Rules:
1. Start with greeting: "${greeting}" if ${languageName} is Hindi, adapt appropriately for other languages
2. Keep it SHORT and URGENT if severity is HIGH
3. Include the key action and revenue impact
4. Use simple farmer language
5. Include relevant emoji (🌾 🍅 💧 ⚠️ 💰)
6. Do NOT change numerical values

Generate ONLY the message text, nothing else.`;

  try {
    const response = await axios.post(
      `${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300
        }
      },
      {
        timeout: 15000
      }
    );

    const message = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return message || formatSimpleMessage(decision, farmerName);

  } catch (err) {
    console.error('[Gemini] Message generation failed:', err.message);
    return formatSimpleMessage(decision, farmerName);
  }
}

/**
 * Fallback simple message formatter
 */
function formatSimpleMessage(decision, farmerName) {
  const greeting = farmerName ? `${farmerName},` : 'Dear Farmer,';
  const icon = decision.severity === 'HIGH' ? '⚠️' : decision.severity === 'MEDIUM' ? '📢' : 'ℹ️';
  const revenueText = decision.revenueImpact?.netValue 
    ? ` Potential value: ₹${decision.revenueImpact.netValue.toLocaleString('en-IN')}`
    : '';
  
  return `${greeting}\n${icon} ${decision.alert}\n${decision.recommendation}${revenueText}\n- AnnaVriddhi`;
}

/**
 * Test Gemini API connection
 */
async function testConnection() {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: 'Say hello in Hindi'
          }]
        }]
      },
      {
        timeout: 10000
      }
    );

    return {
      success: true,
      response: response.data?.candidates?.[0]?.content?.parts?.[0]?.text
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  localizeDecisions,
  generateMessage,
  testConnection,
  SUPPORTED_LANGUAGES
};
