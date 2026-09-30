'use strict';

/**
 * integrations/geminiClient.js
 * Gemini AI integration — uses @google/genai SDK (v1+) with gemini-2.5-flash
 */

const { GoogleGenAI } = require('@google/genai');

const SYSTEM_PROMPT = `You are AnnaVriddhi's Agri Advisor — an expert agricultural advisor for Indian farmers.

Answer in the same language/mix the farmer used (Hindi/English/Hinglish).

CRITICAL RULES:
- Use ONLY the provided farm context for specific numbers (yield, revenue, moisture, prices, soil data)
- For general farming knowledge, answer using your expert agricultural knowledge
- If you don't have enough context, say so and suggest the local Krishi Vigyan Kendra (KVK)
- Be concise and practical — farmers need actionable advice
- Keep responses under 250 words`;

let _client = null;

function _getClient() {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

/**
 * Ask the AI advisor a question with context.
 */
async function askAdvisor(farmerId, queryText, context = {}, conversationHistory = []) {
  try {
    const ai = _getClient();

    // Build farm context block
    let farmContext = '';
    if (context.crop) {
      farmContext += `CROP: ${context.crop.crop_type || 'Unknown'}${context.crop.variety ? ' (' + context.crop.variety + ')' : ''}, ${context.crop.area_ac || '?'} acres\n`;
      farmContext += `SOWN: ${context.crop.sow_date || 'Unknown'} | HARVEST: ${context.crop.expected_harvest_date || 'Not set'}\n`;
    }
    if (context.condition) {
      farmContext += `\nCROP CONDITION:\nScore: ${context.condition.score || 'N/A'}/100 | Moisture: ${context.condition.soil_moisture_pct || 'N/A'}% | Stage: ${context.condition.growth_stage_pct || 'N/A'}%\n`;
    }
    if (context.recent_recommendations?.length > 0) {
      farmContext += `\nRECENT RECOMMENDATIONS:\n`;
      context.recent_recommendations.slice(0, 3).forEach((r, i) => {
        farmContext += `${i + 1}. [${r.priority?.toUpperCase()}] ${r.title}\n`;
      });
    }
    if (context.latest_grade) {
      farmContext += `\nLATEST GRADE: ${context.latest_grade.grade} (score: ${context.latest_grade.score || 'N/A'})\n`;
    }

    // Build history for the chat
    const history = conversationHistory.slice(-4).map(h => [
      { role: 'user', parts: [{ text: h.query }] },
      { role: 'model', parts: [{ text: h.response }] },
    ]).flat();

    const chat = ai.chats.create({
      model: 'gemini-3.6-flash',
      config: {
        systemInstruction: farmContext
          ? `${SYSTEM_PROMPT}\n\nFARM CONTEXT:\n${farmContext}`
          : SYSTEM_PROMPT,
        maxOutputTokens: 512,
        temperature: 0.7,
      },
      history,
    });

    console.log(`[geminiClient] Querying gemini-2.5-flash for farmer ${farmerId}: ${queryText.substring(0, 50)}...`);

    const response = await chat.sendMessage({ message: queryText });
    const text = response.text?.trim() ?? '';

    console.log(`[geminiClient] Response: ${text.substring(0, 100)}...`);
    return text;

  } catch (err) {
    console.error('[geminiClient] Error:', err.message);

    if (err.message?.includes('API key') || err.message?.includes('not configured')) {
      return 'माफ़ करें, AI सेवा अभी उपलब्ध नहीं है।\n\nSorry, AI service is unavailable. Please contact your local Krishi Vigyan Kendra.';
    }
    return 'क्षमा करें, जवाब नहीं दे पाया। कृपया फिर कोशिश करें।\n\nSorry, couldn\'t respond. Please try again.';
  }
}

module.exports = { askAdvisor };
