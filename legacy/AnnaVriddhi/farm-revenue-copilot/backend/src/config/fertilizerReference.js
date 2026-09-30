'use strict';

/**
 * config/fertilizerReference.js
 * Fertilizer recommendation reference data
 * Maps nutrient deficiencies and crop needs to fertilizer recommendations
 */

// ── Nutrient Deficiency Recommendations ──
const DEFICIENCY_RECOMMENDATIONS = {
  nitrogen: {
    nutrient: 'Nitrogen (N)',
    symptoms: [
      'Yellowing of older leaves first',
      'Stunted growth',
      'Pale green coloration',
      'Reduced protein in grains'
    ],
    fertilizers: [
      { name: 'Urea', npk: '46-0-0', application: 'Broadcast or top-dress', rate: '50-100 kg/acre' },
      { name: 'Ammonium Sulfate', npk: '21-0-0', application: 'Apply before sowing or as top-dress', rate: '100-150 kg/acre' },
      { name: 'Calcium Ammonium Nitrate (CAN)', npk: '25-0-0', application: 'Side-dress during growth', rate: '80-120 kg/acre' }
    ],
    reason: 'Nitrogen is essential for leaf growth and chlorophyll production. Deficiency leads to yellowing and reduced yield.',
    caution: 'Avoid over-application as it can cause lodging and delay maturity. Apply in split doses for best results.'
  },

  phosphorus: {
    nutrient: 'Phosphorus (P)',
    symptoms: [
      'Purple or reddish discoloration of leaves',
      'Stunted growth',
      'Delayed maturity',
      'Poor root development'
    ],
    fertilizers: [
      { name: 'Single Super Phosphate (SSP)', npk: '0-16-0', application: 'Basal application at sowing', rate: '125-200 kg/acre' },
      { name: 'Di-Ammonium Phosphate (DAP)', npk: '18-46-0', application: 'Apply before sowing', rate: '50-100 kg/acre' },
      { name: 'Rock Phosphate', npk: '0-30-0', application: 'Long-term application', rate: '200-300 kg/acre' }
    ],
    reason: 'Phosphorus is crucial for energy transfer, root development, and early plant establishment.',
    caution: 'Phosphorus does not move easily in soil. Place near root zone for best uptake.'
  },

  potassium: {
    nutrient: 'Potassium (K)',
    symptoms: [
      'Yellowing and browning of leaf margins (leaf scorch)',
      'Weak stems',
      'Increased susceptibility to disease',
      'Poor grain/fruit quality'
    ],
    fertilizers: [
      { name: 'Muriate of Potash (MOP)', npk: '0-0-60', application: 'Apply before sowing or as top-dress', rate: '30-60 kg/acre' },
      { name: 'Sulfate of Potash (SOP)', npk: '0-0-50', application: 'Use for chloride-sensitive crops', rate: '40-70 kg/acre' }
    ],
    reason: 'Potassium regulates water uptake, activates enzymes, and improves disease resistance and crop quality.',
    caution: 'Balance with nitrogen to avoid nutrient imbalance. Excessive potassium can interfere with calcium and magnesium uptake.'
  },

  sulfur: {
    nutrient: 'Sulfur (S)',
    symptoms: [
      'Yellowing of young leaves',
      'Stunted growth',
      'Thin stems'
    ],
    fertilizers: [
      { name: 'Gypsum', npk: '0-0-0+S', application: 'Broadcast and incorporate', rate: '200-500 kg/acre' },
      { name: 'Ammonium Sulfate', npk: '21-0-0+24S', application: 'Apply at sowing', rate: '50-100 kg/acre' }
    ],
    reason: 'Sulfur is essential for protein synthesis and enzyme activation.',
    caution: 'Often deficient in high-rainfall areas or sandy soils.'
  },

  zinc: {
    nutrient: 'Zinc (Zn)',
    symptoms: [
      'Interveinal chlorosis (yellowing between veins)',
      'Stunted growth',
      'Short internodes',
      'Small leaves'
    ],
    fertilizers: [
      { name: 'Zinc Sulfate', content: '21-33% Zn', application: 'Soil or foliar application', rate: '10-20 kg/acre (soil), 0.5% solution (foliar)' }
    ],
    reason: 'Zinc is a micronutrient essential for growth hormone production and enzyme systems.',
    caution: 'Common in alkaline or high-phosphorus soils. Foliar spray is effective for quick correction.'
  },

  iron: {
    nutrient: 'Iron (Fe)',
    symptoms: [
      'Interveinal chlorosis on young leaves',
      'Leaves remain green along veins',
      'Severe cases cause leaf whitening'
    ],
    fertilizers: [
      { name: 'Ferrous Sulfate', content: '19-20% Fe', application: 'Foliar or soil application', rate: '10-15 kg/acre (soil), 0.5% solution (foliar)' }
    ],
    reason: 'Iron is essential for chlorophyll synthesis and respiration.',
    caution: 'Most common in alkaline soils. Soil application may be ineffective; foliar spray is preferred.'
  },

  magnesium: {
    nutrient: 'Magnesium (Mg)',
    symptoms: [
      'Interveinal chlorosis on older leaves',
      'Leaf margins curl upward',
      'Premature leaf drop'
    ],
    fertilizers: [
      { name: 'Magnesium Sulfate (Epsom Salt)', content: '9.8% Mg', application: 'Soil or foliar application', rate: '20-40 kg/acre (soil), 1-2% solution (foliar)' }
    ],
    reason: 'Magnesium is the central atom in chlorophyll and essential for photosynthesis.',
    caution: 'Deficiency is common in sandy, acidic soils or with high potassium.'
  }
};

// ── Crop-specific NPK ranges (general guidelines) ──
const CROP_NPK_RANGES = {
  wheat: { N: [100, 120], P: [40, 60], K: [30, 40], unit: 'kg/acre' },
  rice: { N: [100, 130], P: [30, 50], K: [30, 50], unit: 'kg/acre' },
  corn: { N: [120, 150], P: [50, 70], K: [40, 60], unit: 'kg/acre' },
  cotton: { N: [80, 100], P: [40, 50], K: [30, 40], unit: 'kg/acre' },
  tomato: { N: [100, 140], P: [60, 80], K: [80, 120], unit: 'kg/acre' },
  potato: { N: [100, 120], P: [60, 80], K: [100, 140], unit: 'kg/acre' },
  soybean: { N: [20, 30], P: [40, 60], K: [30, 50], unit: 'kg/acre' }  // Legume - fixes nitrogen
};

/**
 * Get deficiency recommendation
 * @param {string} nutrient - e.g., 'nitrogen', 'phosphorus'
 * @returns {object|null}
 */
function getDeficiencyRecommendation(nutrient) {
  const key = nutrient.toLowerCase();
  return DEFICIENCY_RECOMMENDATIONS[key] || null;
}

/**
 * Get crop NPK range
 * @param {string} cropType
 * @returns {object|null}
 */
function getCropNPKRange(cropType) {
  const key = cropType.toLowerCase();
  return CROP_NPK_RANGES[key] || null;
}

/**
 * Determine which nutrients are deficient based on soil data
 * @param {object} soilData - { n, p, k, ... }
 * @param {string} cropType
 * @returns {string[]} - Array of deficient nutrient names
 */
function identifyDeficiencies(soilData, cropType) {
  const deficiencies = [];
  const cropRange = getCropNPKRange(cropType);
  
  if (!cropRange || !soilData) return deficiencies;

  // Simplified logic - compare soil values to minimum crop requirements
  // In production, use proper soil test interpretation
  if (soilData.n !== undefined && soilData.n < cropRange.N[0] * 0.6) {
    deficiencies.push('nitrogen');
  }
  if (soilData.p !== undefined && soilData.p < cropRange.P[0] * 0.6) {
    deficiencies.push('phosphorus');
  }
  if (soilData.k !== undefined && soilData.k < cropRange.K[0] * 0.6) {
    deficiencies.push('potassium');
  }

  // Micronutrients (if available)
  if (soilData.zn !== undefined && soilData.zn < 0.6) {
    deficiencies.push('zinc');
  }
  if (soilData.fe !== undefined && soilData.fe < 4.5) {
    deficiencies.push('iron');
  }

  return deficiencies;
}

module.exports = {
  DEFICIENCY_RECOMMENDATIONS,
  CROP_NPK_RANGES,
  getDeficiencyRecommendation,
  getCropNPKRange,
  identifyDeficiencies
};
