'use strict';

/**
 * config/cropMaturity.js
 * Reference table: days to maturity for common Indian crops.
 * Used to compute growth_stage_pct in crop state snapshots.
 * 
 * Source: Indian Council of Agricultural Research (ICAR) and state agriculture departments.
 */

const CROP_MATURITY_DAYS = {
  // Cereals
  'wheat':          120,
  'rice':           140,
  'paddy':          140, // alias for rice
  'maize':          90,
  'corn':           90,  // alias for maize
  'bajra':          75,  // pearl millet
  'jowar':          110, // sorghum
  'ragi':           120, // finger millet
  'barley':         120,

  // Pulses
  'chickpea':       100,
  'chana':          100, // alias for chickpea
  'pigeon-pea':     150,
  'tur':            150, // alias for pigeon pea
  'arhar':          150, // alias for pigeon pea
  'lentil':         110,
  'masoor':         110, // alias for lentil
  'green-gram':     70,
  'moong':          70,  // alias for green gram
  'black-gram':     80,
  'urad':           80,  // alias for black gram

  // Oilseeds
  'groundnut':      120,
  'peanut':         120, // alias for groundnut
  'mustard':        100,
  'rapeseed':       100,
  'sunflower':      90,
  'soybean':        100,
  'sesame':         90,
  'til':            90,  // alias for sesame

  // Cash crops
  'cotton':         180,
  'sugarcane':      360,
  'jute':           120,
  'tobacco':        120,

  // Vegetables (short-duration)
  'tomato':         90,
  'potato':         90,
  'onion':          120,
  'cabbage':        90,
  'cauliflower':    80,
  'brinjal':        120, // eggplant
  'eggplant':       120,
  'okra':           60,
  'bhindi':         60,  // alias for okra
  'chili':          90,
  'pepper':         90,
  'pumpkin':        100,
  'cucumber':       60,
  'bottle-gourd':   80,

  // Fruits (perennials - use first harvest cycle)
  'banana':         300,
  'mango':          365, // first season bearing
  'papaya':         270,
  'guava':          180,
  'pomegranate':    180,

  // Spices
  'turmeric':       240,
  'ginger':         210,
  'coriander':      45,
  'cumin':          120,
  'fenugreek':      90,
  'methi':          90,  // alias for fenugreek

  // Fodder
  'fodder-maize':   60,
  'fodder-sorghum': 70,
  'berseem':        90,
};

/**
 * Get maturity days for a crop type (case-insensitive).
 * Returns a default of 120 days if crop not found.
 * @param {string} cropType
 * @returns {number}
 */
function getMaturityDays(cropType) {
  if (!cropType) return 120;
  const normalized = cropType.toLowerCase().trim().replace(/\s+/g, '-');
  return CROP_MATURITY_DAYS[normalized] || 120;
}

module.exports = {
  CROP_MATURITY_DAYS,
  getMaturityDays,
};
