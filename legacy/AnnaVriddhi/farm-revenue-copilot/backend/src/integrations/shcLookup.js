'use strict';

/**
 * integrations/shcLookup.js
 * Soil Health Card (SHC) portal lookup.
 * Fetches soil test results for a farmer/plot from the Government SHC API.
 */

const https = require('https');

const BASE_URL = process.env.SHC_API_BASE_URL || '';
const API_KEY  = process.env.SHC_API_KEY || '';

/**
 * Look up soil health card data by farmer ID or plot details.
 * @param {{ farmerId?: string, state?: string, district?: string, village?: string }} params
 * @returns {Promise<object>}
 */
async function getSoilHealthCard(params) {
  if (!BASE_URL) {
    throw new Error('SHC_API_BASE_URL is not configured');
  }
  const query = new URLSearchParams({ ...params, apiKey: API_KEY }).toString();
  const url   = `${BASE_URL}/shc?${query}`;
  return _get(url);
}

function _get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

module.exports = { getSoilHealthCard };
