/**
 * Decision Engine Core
 * Combines crop state, sensors, weather into actionable decisions
 */

const nutritionService = require('./nutritionService');
const weatherProtectionService = require('./weatherProtectionService');
const harvestWindowService = require('./harvestWindowService');
const irrigationService = require('./irrigationService');
const revenueService = require('./revenueService');
const geminiService = require('./geminiService');

/**
 * Generate comprehensive farm decisions for a crop
 * @param {Object} params - Input parameters
 * @param {string} params.farmId - Farm ID
 * @param {string} params.cropId - Crop ID
 * @param {string} params.crop - Crop type (e.g., 'tomato', 'wheat')
 * @param {string} params.growthStage - Current growth stage
 * @param {Object} params.sensorData - Latest sensor readings
 * @param {Object} params.cropHealthData - CV model output
 * @param {Object} params.location - { lat, lon }
 * @param {string} params.language - Target language (default: 'en')
 * @returns {Promise<Object>} Comprehensive decision output
 */
async function generateDecisions(params) {
  const {
    farmId,
    cropId,
    crop,
    growthStage,
    sensorData = {},
    cropHealthData = {},
    location,
    language = 'en'
  } = params;

  console.log(`[DecisionEngine] Generating decisions for farm=${farmId}, crop=${cropId}`);

  // Run all decision modules in parallel
  const [
    nutritionDecision,
    irrigationDecision,
    weatherDecision,
    harvestDecision
  ] = await Promise.all([
    nutritionService.analyzeNutrition({
      crop,
      growthStage,
      nitrogen: sensorData.nitrogen,
      phosphorus: sensorData.phosphorus,
      potassium: sensorData.potassium,
      pH: sensorData.pH
    }).catch(err => {
      console.error('[DecisionEngine] Nutrition analysis failed:', err.message);
      return { type: 'NUTRITION', severity: 'UNKNOWN', error: err.message };
    }),

    irrigationService.analyzeIrrigation({
      crop,
      soilMoisture: sensorData.soilMoisture,
      location,
      growthStage
    }).catch(err => {
      console.error('[DecisionEngine] Irrigation analysis failed:', err.message);
      return { type: 'IRRIGATION', severity: 'UNKNOWN', error: err.message };
    }),

    weatherProtectionService.analyzeWeatherRisk({
      location,
      crop,
      cropValue: cropHealthData.estimatedValue || 0
    }).catch(err => {
      console.error('[DecisionEngine] Weather analysis failed:', err.message);
      return { type: 'WEATHER_PROTECTION', severity: 'UNKNOWN', error: err.message };
    }),

    harvestWindowService.analyzeHarvestWindow({
      crop,
      ripeness: cropHealthData.ripeness,
      grade: cropHealthData.grade,
      defectRisk: cropHealthData.defectScore,
      location
    }).catch(err => {
      console.error('[DecisionEngine] Harvest analysis failed:', err.message);
      return { type: 'HARVEST_WINDOW', severity: 'UNKNOWN', error: err.message };
    })
  ]);

  // Calculate revenue impact for each decision
  const decisionsWithRevenue = await Promise.all([
    addRevenueImpact(nutritionDecision, { crop, farmId }),
    addRevenueImpact(irrigationDecision, { crop, farmId }),
    addRevenueImpact(weatherDecision, { crop, farmId }),
    addRevenueImpact(harvestDecision, { crop, farmId })
  ]);

  // Sort by severity and revenue impact
  const sortedDecisions = decisionsWithRevenue
    .filter(d => !d.error)
    .sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1, NORMAL: 0 };
      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;
      
      if (aSeverity !== bSeverity) return bSeverity - aSeverity;
      return (b.revenueImpact?.netValue || 0) - (a.revenueImpact?.netValue || 0);
    });

  // Get top priority action
  const topPriorityAction = sortedDecisions[0];

  // Generate summary
  const summary = generateSummary(decisionsWithRevenue);

  // Localize if not English
  let localizedSummary = summary;
  let localizedDecisions = decisionsWithRevenue;
  
  if (language !== 'en') {
    try {
      const localized = await geminiService.localizeDecisions({
        summary,
        decisions: decisionsWithRevenue,
        language,
        crop
      });
      localizedSummary = localized.summary;
      localizedDecisions = localized.decisions;
    } catch (err) {
      console.error('[DecisionEngine] Localization failed:', err.message);
      // Fall back to English
    }
  }

  return {
    farmId,
    cropId,
    timestamp: new Date().toISOString(),
    language,
    summary: localizedSummary,
    topPriorityAction: language === 'en' ? topPriorityAction : localizedDecisions[0],
    decisions: localizedDecisions,
    cropHealth: {
      overall: cropHealthData.overall || 'unknown',
      ripeness: cropHealthData.ripeness,
      grade: cropHealthData.grade,
      defects: cropHealthData.defects
    },
    totalRevenueImpact: decisionsWithRevenue.reduce((sum, d) => 
      sum + (d.revenueImpact?.netValue || 0), 0
    )
  };
}

/**
 * Add revenue impact calculation to a decision
 */
async function addRevenueImpact(decision, context) {
  if (decision.error || decision.severity === 'NORMAL') {
    return { ...decision, revenueImpact: null };
  }

  try {
    const revenueImpact = await revenueService.calculateImpact({
      decisionType: decision.type,
      severity: decision.severity,
      recommendation: decision.recommendation,
      crop: context.crop,
      farmId: context.farmId,
      metadata: decision.metadata || {}
    });

    return { ...decision, revenueImpact };
  } catch (err) {
    console.error(`[DecisionEngine] Revenue calculation failed for ${decision.type}:`, err.message);
    return { ...decision, revenueImpact: null };
  }
}

/**
 * Generate human-readable summary
 */
function generateSummary(decisions) {
  const highPriority = decisions.filter(d => d.severity === 'HIGH' && !d.error);
  
  if (highPriority.length === 0) {
    return "All systems normal. Continue regular monitoring.";
  }

  const top = highPriority[0];
  const revenueText = top.revenueImpact?.netValue 
    ? ` to potentially protect ₹${top.revenueImpact.netValue.toLocaleString('en-IN')} of crop value`
    : '';

  switch (top.type) {
    case 'WEATHER_PROTECTION':
      return `⚠️ ${top.alert} ${top.recommendation}${revenueText}.`;
    case 'IRRIGATION':
      return `💧 ${top.alert} ${top.recommendation}${revenueText}.`;
    case 'NUTRITION':
      return `🌱 ${top.alert} ${top.recommendation}${revenueText}.`;
    case 'HARVEST_WINDOW':
      return `🌾 ${top.alert} ${top.recommendation}${revenueText}.`;
    default:
      return `${top.alert} ${top.recommendation}${revenueText}.`;
  }
}

/**
 * Get dashboard overview for a farm
 */
async function getDashboardOverview(farmId, language = 'en') {
  // This would typically fetch latest crop data from DB
  // For now, return structure
  
  return {
    farmId,
    timestamp: new Date().toISOString(),
    language,
    cards: {
      cropHealth: {
        score: 82,
        status: 'GOOD',
        trend: 'stable'
      },
      irrigation: {
        status: 'HIGH_ALERT',
        nextAction: 'Irrigate within 6 hours'
      },
      weather: {
        riskLevel: 'HIGH',
        threat: 'Hail risk tomorrow'
      },
      harvest: {
        window: '2-3 days',
        readiness: 87
      }
    },
    topAction: null // Will be populated by generateDecisions
  };
}

module.exports = {
  generateDecisions,
  getDashboardOverview
};
