'use strict';

/**
 * config/cropWaterRequirements.js
 * Reference table: Daily water requirements for Indian crops by growth stage.
 * Values in mm/day based on ICAR crop water requirement guidelines.
 * 
 * Source: Indian Council of Agricultural Research (ICAR) 
 * - Crop Water Requirements for Major Crops
 * - FAO-56 Penman-Monteith reference ET adjustments for Indian conditions
 */

// Growth stage brackets
const GROWTH_STAGES = {
  INITIAL: { min: 0, max: 25 },      // Germination to 25%
  DEVELOPMENT: { min: 25, max: 50 }, // 25% to 50%
  MID_SEASON: { min: 50, max: 85 },  // 50% to 85%
  LATE_SEASON: { min: 85, max: 100 },// 85% to 100%
};

/**
 * Daily water requirements (mm/day) by crop type and growth stage.
 * Format: { crop_type: { initial, development, mid_season, late_season } }
 */
const WATER_REQUIREMENTS = {
  // Cereals
  wheat: {
    initial: 3.0,
    development: 4.5,
    mid_season: 6.5,
    late_season: 3.5,
    total_season_mm: 450, // Total for 120-day cycle
  },
  rice: {
    initial: 5.0,  // Rice needs standing water
    development: 7.0,
    mid_season: 9.0,
    late_season: 4.0,
    total_season_mm: 900, // High water requirement
  },
  paddy: {
    initial: 5.0,
    development: 7.0,
    mid_season: 9.0,
    late_season: 4.0,
    total_season_mm: 900,
  },
  maize: {
    initial: 3.5,
    development: 5.0,
    mid_season: 6.5,
    late_season: 4.0,
    total_season_mm: 500,
  },
  corn: {
    initial: 3.5,
    development: 5.0,
    mid_season: 6.5,
    late_season: 4.0,
    total_season_mm: 500,
  },

  // Cash crops
  cotton: {
    initial: 3.0,
    development: 4.5,
    mid_season: 7.0,
    late_season: 4.5,
    total_season_mm: 700,
  },
  sugarcane: {
    initial: 4.0,
    development: 6.0,
    mid_season: 8.0,
    late_season: 5.0,
    total_season_mm: 1800, // Long duration crop
  },

  // Oilseeds
  soybean: {
    initial: 3.0,
    development: 4.5,
    mid_season: 6.0,
    late_season: 3.0,
    total_season_mm: 450,
  },
  groundnut: {
    initial: 3.0,
    development: 4.0,
    mid_season: 5.5,
    late_season: 4.0,
    total_season_mm: 500,
  },
  peanut: {
    initial: 3.0,
    development: 4.0,
    mid_season: 5.5,
    late_season: 4.0,
    total_season_mm: 500,
  },
  mustard: {
    initial: 2.5,
    development: 4.0,
    mid_season: 5.0,
    late_season: 3.0,
    total_season_mm: 350,
  },
  sunflower: {
    initial: 3.0,
    development: 5.0,
    mid_season: 6.5,
    late_season: 3.5,
    total_season_mm: 450,
  },

  // Pulses
  chickpea: {
    initial: 2.5,
    development: 3.5,
    mid_season: 5.0,
    late_season: 2.5,
    total_season_mm: 350,
  },
  chana: {
    initial: 2.5,
    development: 3.5,
    mid_season: 5.0,
    late_season: 2.5,
    total_season_mm: 350,
  },

  // Default (medium water requirement crop)
  default: {
    initial: 3.0,
    development: 4.5,
    mid_season: 6.0,
    late_season: 3.5,
    total_season_mm: 500,
  },
};

/**
 * Get the growth stage bracket for a given growth stage percentage.
 * @param {number} growthStagePct - Growth stage percentage (0-100)
 * @returns {string} - 'initial', 'development', 'mid_season', or 'late_season'
 */
function getGrowthStageBracket(growthStagePct) {
  if (growthStagePct === null || growthStagePct === undefined) {
    return 'mid_season'; // Default to peak water need
  }

  if (growthStagePct < GROWTH_STAGES.INITIAL.max) return 'initial';
  if (growthStagePct < GROWTH_STAGES.DEVELOPMENT.max) return 'development';
  if (growthStagePct < GROWTH_STAGES.MID_SEASON.max) return 'mid_season';
  return 'late_season';
}

/**
 * Get daily water requirement for a crop at a specific growth stage.
 * @param {string} cropType - Crop type name
 * @param {number} growthStagePct - Growth stage percentage (0-100)
 * @returns {number} - Water requirement in mm/day
 */
function getWaterRequirement(cropType, growthStagePct) {
  // Normalize crop type
  const normalized = cropType 
    ? cropType.toLowerCase().trim().replace(/\s+/g, '-')
    : 'default';

  // Get crop requirements or use default
  const cropReqs = WATER_REQUIREMENTS[normalized] || WATER_REQUIREMENTS.default;

  // Get appropriate stage bracket
  const stageBracket = getGrowthStageBracket(growthStagePct);

  // Return requirement for that stage
  return cropReqs[stageBracket];
}

/**
 * Get total seasonal water requirement for a crop.
 * @param {string} cropType - Crop type name
 * @returns {number} - Total seasonal water requirement in mm
 */
function getTotalSeasonalRequirement(cropType) {
  const normalized = cropType 
    ? cropType.toLowerCase().trim().replace(/\s+/g, '-')
    : 'default';

  const cropReqs = WATER_REQUIREMENTS[normalized] || WATER_REQUIREMENTS.default;
  return cropReqs.total_season_mm;
}

module.exports = {
  WATER_REQUIREMENTS,
  GROWTH_STAGES,
  getWaterRequirement,
  getTotalSeasonalRequirement,
  getGrowthStageBracket,
};
