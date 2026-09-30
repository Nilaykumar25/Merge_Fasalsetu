'use strict';

/**
 * revenueService.js
 * Core revenue calculation logic.
 * Combines expected yield, market price, input costs, and scheme benefits.
 */

const db = require('../models/db');

// ── Hardcoded cost estimates per intervention type (in INR) ──
const INTERVENTION_COSTS = {
  irrigation:  500,   // Per application
  fertilizer:  1200,  // Per application
  pesticide:   800,   // Per application
  cover:       2000,  // Protective covers/nets
  do_nothing:  0,     // No cost
};

// ── Hardcoded yield impact percentages per intervention ──
const YIELD_IMPACT = {
  irrigation:  0.08,   // +8% yield if irrigated when needed
  fertilizer:  0.12,   // +12% yield with fertilizer
  pesticide:   0.15,   // +15% yield (prevents loss from pests)
  cover:       0.10,   // +10% yield (prevents storm damage)
  do_nothing:  0.00,   // No change
};

// ── Average market prices per crop type (INR per quintal) ──
// Source: Agmarknet historical averages
const MARKET_PRICES = {
  wheat:      2000,
  rice:       1800,
  paddy:      1800,
  cotton:     5500,
  sugarcane:  280,  // Per quintal (lower per unit but high volume)
  maize:      1700,
  corn:       1700,
  soybean:    3800,
  chickpea:   5000,
  chana:      5000,
  groundnut:  5200,
  peanut:     5200,
  mustard:    4500,
  sunflower:  4200,
  default:    2500, // Fallback
};

/**
 * Get market price for a crop type.
 * @param {string} cropType
 * @returns {number} - Price in INR per quintal
 */
function getMarketPrice(cropType) {
  if (!cropType) return MARKET_PRICES.default;
  const normalized = cropType.toLowerCase().trim().replace(/\s+/g, '-');
  return MARKET_PRICES[normalized] || MARKET_PRICES.default;
}

/**
 * Estimate expected yield for a crop based on area and crop type.
 * @param {number} areaAc - Area in acres
 * @param {string} cropType
 * @returns {number} - Expected yield in quintals
 */
function estimateBaseYield(areaAc, cropType) {
  // Average yield per acre in quintals (conservative estimates)
  const yieldPerAcre = {
    wheat:      20,
    rice:       25,
    cotton:     12,
    sugarcane:  300,
    maize:      22,
    soybean:    15,
    default:    18,
  };
  
  const normalized = cropType?.toLowerCase().trim().replace(/\s+/g, '-');
  const yieldRate = yieldPerAcre[normalized] || yieldPerAcre.default;
  
  return areaAc * yieldRate;
}

/**
 * Compute baseline revenue (if no action is taken).
 * @param {string} cropId - UUID of the crop
 * @returns {Promise<number>} - Baseline revenue in INR
 */
async function computeBaselineRevenue(cropId) {
  try {
    const cropResult = await db.query(
      'SELECT crop_type, area_ac FROM crops WHERE id = $1',
      [cropId]
    );
    
    if (cropResult.rows.length === 0) {
      console.warn(`[revenueService] Crop ${cropId} not found`);
      return 0;
    }
    
    const { crop_type, area_ac } = cropResult.rows[0];
    
    // Get base yield estimate (current trajectory, no intervention)
    const baseYield = estimateBaseYield(area_ac || 1, crop_type);
    
    // Get market price
    const pricePerQuintal = getMarketPrice(crop_type);
    
    // Baseline revenue = current expected yield × price
    const baselineRevenue = baseYield * pricePerQuintal;
    
    return parseFloat(baselineRevenue.toFixed(2));
    
  } catch (err) {
    console.error('[revenueService] Error computing baseline revenue:', err.message);
    return 0;
  }
}

/**
 * Compute projected revenue (if recommended action is taken).
 * @param {string} cropId - UUID of the crop
 * @param {string} recommendationType - Type of recommendation
 * @returns {Promise<number>} - Projected revenue in INR
 */
async function computeProjectedRevenue(cropId, recommendationType) {
  try {
    const cropResult = await db.query(
      'SELECT crop_type, area_ac FROM crops WHERE id = $1',
      [cropId]
    );
    
    if (cropResult.rows.length === 0) {
      console.warn(`[revenueService] Crop ${cropId} not found`);
      return 0;
    }
    
    const { crop_type, area_ac } = cropResult.rows[0];
    
    // Get base yield estimate
    const baseYield = estimateBaseYield(area_ac || 1, crop_type);
    
    // Get yield impact percentage for this intervention
    const yieldImpactPct = YIELD_IMPACT[recommendationType] || 0;
    
    // Projected yield = base yield × (1 + impact percentage)
    const projectedYield = baseYield * (1 + yieldImpactPct);
    
    // Get market price
    const pricePerQuintal = getMarketPrice(crop_type);
    
    // Projected revenue = projected yield × price - intervention cost
    const revenueBeforeCost = projectedYield * pricePerQuintal;
    const cost = INTERVENTION_COSTS[recommendationType] || 0;
    const projectedRevenue = revenueBeforeCost - cost;
    
    return parseFloat(projectedRevenue.toFixed(2));
    
  } catch (err) {
    console.error('[revenueService] Error computing projected revenue:', err.message);
    return 0;
  }
}

/**
 * Estimate revenue impact of taking a recommended action.
 * Returns both absolute (₹) and percentage impact.
 * Formula: predicted_yield_delta × price_per_unit - cost_of_action
 * 
 * @param {string} cropId - UUID of the crop
 * @param {string} recommendationType - Type of recommendation
 * @returns {Promise<{ predicted_revenue_impact: number, revenue_impact_pct: number }>}
 */
async function estimateImpact(cropId, recommendationType) {
  try {
    // Compute baseline (do nothing scenario)
    const baselineRevenue = await computeBaselineRevenue(cropId);
    
    // Compute projected (take action scenario)
    const projectedRevenue = await computeProjectedRevenue(cropId, recommendationType);
    
    // Calculate absolute impact
    const predicted_revenue_impact = projectedRevenue - baselineRevenue;
    
    // Calculate percentage impact
    const revenue_impact_pct = baselineRevenue > 0 
      ? ((projected_revenue_impact / baselineRevenue) * 100)
      : 0;
    
    console.log(
      `[revenueService] Impact for crop ${cropId} (${recommendationType}): ` +
      `₹${predicted_revenue_impact.toFixed(2)} (${revenue_impact_pct.toFixed(2)}%)`
    );
    
    return {
      predicted_revenue_impact: parseFloat(predicted_revenue_impact.toFixed(2)),
      revenue_impact_pct: parseFloat(revenue_impact_pct.toFixed(2)),
    };
    
  } catch (err) {
    console.error('[revenueService] Error estimating impact:', err.message);
    return {
      predicted_revenue_impact: 0,
      revenue_impact_pct: 0,
    };
  }
}

/**
 * Calculate projected net revenue for a crop.
 *
 * @param {{
 *   expectedYieldKg: number,
 *   marketPricePerKg: number,
 *   inputCostTotal: number,
 *   schemeBenefitTotal?: number
 * }} params
 * @returns {{ grossRevenue: number, netRevenue: number, profitMarginPct: number }}
 */
function calculateProjectedRevenue({ expectedYieldKg, marketPricePerKg, inputCostTotal, schemeBenefitTotal = 0 }) {
  const grossRevenue = expectedYieldKg * marketPricePerKg;
  const netRevenue   = grossRevenue - inputCostTotal + schemeBenefitTotal;
  const profitMarginPct = grossRevenue > 0
    ? Math.round((netRevenue / grossRevenue) * 100 * 10) / 10
    : 0;

  return { grossRevenue, netRevenue, profitMarginPct };
}

/**
 * Score crop state on a 0–100 scale based on multiple field signals.
 * Higher = better revenue potential.
 *
 * @param {{ soilMoisturePct: number, leafColorScore: number, pestPressureScore: number, growthStagePct: number }} signals
 * @returns {number}
 */
function scoreCropState({ soilMoisturePct, leafColorScore, pestPressureScore, growthStagePct }) {
  // Weighted average — weights sum to 1
  const score =
    soilMoisturePct   * 0.30 +
    leafColorScore    * 0.30 +
    pestPressureScore * 0.20 +
    growthStagePct    * 0.20;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculate revenue impact for decision engine
 * @param {Object} params
 * @param {string} params.decisionType - Type of decision
 * @param {string} params.severity - Severity level
 * @param {string} params.recommendation - Recommendation text
 * @param {string} params.crop - Crop type
 * @param {string} params.farmId - Farm ID
 * @param {Object} params.metadata - Additional context
 * @returns {Promise<Object>} Revenue impact
 */
async function calculateImpact(params) {
  const { decisionType, severity, crop, metadata = {} } = params;

  // Base values
  const baseYield = metadata.expectedYield || estimateBaseYield(metadata.area || 1, crop); // quintals
  const marketPrice = getMarketPrice(crop); // ₹ per quintal
  const baseRevenue = baseYield * marketPrice;

  let expectedLoss = 0;
  let actionCost = 0;
  let expectedSavings = 0;

  switch (decisionType) {
    case 'IRRIGATION':
      expectedLoss = calculateIrrigationLoss(severity, baseRevenue);
      actionCost = INTERVENTION_COSTS.irrigation * (metadata.area || 1);
      expectedSavings = expectedLoss - actionCost;
      break;

    case 'NUTRITION':
      expectedLoss = calculateNutritionLoss(severity, baseRevenue);
      actionCost = INTERVENTION_COSTS.fertilizer * (metadata.area || 1);
      expectedSavings = expectedLoss - actionCost;
      break;

    case 'WEATHER_PROTECTION':
      if (metadata.economics) {
        // Use pre-calculated economics from weather service
        expectedLoss = metadata.economics.expectedLoss;
        actionCost = metadata.economics.protectionCost;
        expectedSavings = metadata.economics.netValueProtected;
      } else {
        expectedLoss = calculateWeatherLoss(severity, baseRevenue);
        actionCost = INTERVENTION_COSTS.cover * (metadata.area || 1);
        expectedSavings = expectedLoss - actionCost;
      }
      break;

    case 'HARVEST_WINDOW':
      expectedLoss = calculateHarvestDelayLoss(severity, metadata, baseRevenue);
      actionCost = calculateHarvestCost(metadata);
      expectedSavings = expectedLoss - actionCost;
      break;

    default:
      expectedLoss = 0;
      actionCost = 0;
      expectedSavings = 0;
  }

  return {
    baseRevenue: Math.round(baseRevenue),
    expectedLoss: Math.round(expectedLoss),
    actionCost: Math.round(actionCost),
    expectedSavings: Math.round(expectedSavings),
    netValue: Math.round(Math.max(0, expectedSavings)),
    roiPercent: actionCost > 0 ? Math.round((expectedSavings / actionCost) * 100) : 0
  };
}

function calculateIrrigationLoss(severity, baseRevenue) {
  const lossPercent = {
    HIGH: 0.20,    // 20% yield loss
    MEDIUM: 0.10,  // 10% yield loss
    LOW: 0.05      // 5% yield loss
  };
  return baseRevenue * (lossPercent[severity] || 0);
}

function calculateNutritionLoss(severity, baseRevenue) {
  const lossPercent = {
    HIGH: 0.25,    // 25% yield loss from severe deficiency
    MEDIUM: 0.15,  // 15% yield loss
    LOW: 0.08      // 8% yield loss
  };
  return baseRevenue * (lossPercent[severity] || 0);
}

function calculateWeatherLoss(severity, baseRevenue) {
  const lossPercent = {
    HIGH: 0.30,    // 30% loss from severe weather
    MEDIUM: 0.15,
    LOW: 0.05
  };
  return baseRevenue * (lossPercent[severity] || 0);
}

function calculateHarvestDelayLoss(severity, metadata, baseRevenue) {
  // Loss from poor timing
  if (metadata.weatherRisk && metadata.weatherRisk.priority === 'CRITICAL') {
    return baseRevenue * 0.25; // 25% loss from weather damage
  }
  
  if (metadata.defectRisk > 70) {
    return baseRevenue * 0.20; // 20% loss from quality degradation
  }

  const lossPercent = {
    HIGH: 0.15,
    MEDIUM: 0.08,
    LOW: 0.03
  };
  return baseRevenue * (lossPercent[severity] || 0);
}

function calculateHarvestCost(metadata) {
  const areaInAcres = metadata.area || 1;
  const costPerAcre = 3000; // Labor + transport
  return areaInAcres * costPerAcre;
}

module.exports = { 
  calculateProjectedRevenue, 
  scoreCropState,
  estimateImpact,
  computeBaselineRevenue,
  computeProjectedRevenue,
  getMarketPrice,
  estimateBaseYield,
  calculateImpact,
  INTERVENTION_COSTS,
  YIELD_IMPACT,
};
