'use strict';

/**
 * services/cropWrappedService.js
 * Personalized seasonal farm review - aggregates season data into Spotify Wrapped-style summary
 */

const db = require('../models/db');

/**
 * Get season data for a crop (season = crop lifecycle)
 * @param {string} cropId
 * @returns {Promise<object|null>}
 */
async function getSeasonData(cropId) {
  const result = await db.query(
    `SELECT 
      c.id,
      c.farmer_id,
      c.crop_type,
      c.variety,
      c.sow_date,
      c.expected_harvest_date,
      c.status,
      c.season_name,
      c.completed_at,
      c.area_ac,
      f.name as farmer_name
     FROM crops c
     JOIN farmers f ON f.id = c.farmer_id
     WHERE c.id = $1`,
    [cropId]
  );
  
  return result.rows[0] || null;
}

/**
 * Calculate days tracked for a season
 * @param {Date} sowDate
 * @param {Date|null} completedAt
 * @param {string} status
 * @returns {number}
 */
function calculateDaysTracked(sowDate, completedAt, status) {
  const endDate = status === 'harvested' && completedAt ? 
    new Date(completedAt) : new Date();
  const startDate = new Date(sowDate);
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get season name from crop data
 * @param {object} season
 * @returns {string}
 */
function getSeasonDisplayName(season) {
  if (season.season_name) {
    return season.season_name;
  }
  
  // Generate season name from sow date
  const sowDate = new Date(season.sow_date);
  const year = sowDate.getFullYear();
  const month = sowDate.getMonth(); // 0-11
  
  // Kharif: June-September (5-8), Rabi: October-March (9-2), Zaid: April-May (3-4)
  let seasonType = 'Season';
  if (month >= 5 && month <= 8) {
    seasonType = 'Kharif';
  } else if (month >= 9 || month <= 2) {
    seasonType = 'Rabi';
  } else {
    seasonType = 'Zaid';
  }
  
  return `${seasonType} ${year}`;
}

/**
 * Get overview statistics for a season
 * @param {string} cropId
 * @returns {Promise<object>}
 */
async function getOverview(cropId) {
  // Get all recommendations for this crop
  const recResult = await db.query(
    `SELECT 
      re.id,
      re.type,
      re.priority,
      re.created_at
     FROM recommendation_events re
     WHERE re.crop_id = $1
       AND re.type != 'do_nothing'
     ORDER BY re.created_at ASC`,
    [cropId]
  );
  
  const recommendations = recResult.rows;
  
  // Get all farmer actions
  const actionResult = await db.query(
    `SELECT 
      fa.recommendation_id,
      fa.followed,
      fa.created_at
     FROM farmer_actions fa
     WHERE fa.crop_id = $1
     ORDER BY fa.created_at DESC`,
    [cropId]
  );
  
  const actions = actionResult.rows;
  
  // Build recommendation -> action map (use latest action per recommendation)
  const actionMap = new Map();
  for (const action of actions) {
    if (!actionMap.has(action.recommendation_id)) {
      actionMap.set(action.recommendation_id, action.followed);
    }
  }
  
  // Calculate statistics
  let followed = 0;
  let notFollowed = 0;
  let unknown = 0;
  
  for (const rec of recommendations) {
    const actionStatus = actionMap.get(rec.id);
    if (actionStatus === 'FOLLOWED') {
      followed++;
    } else if (actionStatus === 'NOT_FOLLOWED') {
      notFollowed++;
    } else {
      unknown++;
    }
  }
  
  // Count disease alerts (type = pesticide with high/medium priority)
  const diseaseAlerts = recommendations.filter(r => 
    r.type === 'pesticide' && (r.priority === 'high' || r.priority === 'medium')
  ).length;
  
  return {
    recommendations: recommendations.length,
    actionsRecorded: followed + notFollowed,
    followed,
    notFollowed,
    unknown,
    diseaseAlerts,
  };
}

/**
 * Calculate recommendation adherence
 * @param {number} followed
 * @param {number} notFollowed
 * @param {number} unknown
 * @returns {object}
 */
function calculateAdherence(followed, notFollowed, unknown) {
  const knownActions = followed + notFollowed;
  
  if (knownActions === 0) {
    return {
      percentage: null,
      followed,
      notFollowed,
      unknown,
      knownActions: 0,
    };
  }
  
  const percentage = (followed / knownActions) * 100;
  
  return {
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimals
    followed,
    notFollowed,
    unknown,
    knownActions,
  };
}

/**
 * Get category-wise adherence breakdown
 * @param {string} cropId
 * @returns {Promise<object>}
 */
async function getCategoryAdherence(cropId) {
  const result = await db.query(
    `SELECT 
      re.type,
      fa.followed,
      COUNT(*) as count
     FROM recommendation_events re
     LEFT JOIN farmer_actions fa ON fa.recommendation_id = re.id
     WHERE re.crop_id = $1
       AND re.type != 'do_nothing'
     GROUP BY re.type, fa.followed`,
    [cropId]
  );
  
  // Group by category
  const categoryData = {};
  
  for (const row of result.rows) {
    const category = row.type;
    if (!categoryData[category]) {
      categoryData[category] = { followed: 0, notFollowed: 0, unknown: 0 };
    }
    
    if (row.followed === 'FOLLOWED') {
      categoryData[category].followed = parseInt(row.count);
    } else if (row.followed === 'NOT_FOLLOWED') {
      categoryData[category].notFollowed = parseInt(row.count);
    } else {
      categoryData[category].unknown = parseInt(row.count);
    }
  }
  
  // Calculate percentages
  const categoryAdherence = {};
  for (const [category, data] of Object.entries(categoryData)) {
    const knownActions = data.followed + data.notFollowed;
    const percentage = knownActions > 0 ? 
      Math.round((data.followed / knownActions) * 10000) / 100 : null;
    
    categoryAdherence[category] = {
      ...data,
      percentage,
    };
  }
  
  return categoryAdherence;
}

/**
 * Get disease summary for the season
 * @param {string} cropId
 * @returns {Promise<object>}
 */
async function getDiseaseSummary(cropId) {
  const result = await db.query(
    `SELECT 
      re.id,
      re.title,
      re.body,
      re.priority,
      re.created_at,
      fa.followed
     FROM recommendation_events re
     LEFT JOIN farmer_actions fa ON fa.recommendation_id = re.id
     WHERE re.crop_id = $1
       AND re.type = 'pesticide'
       AND (re.priority = 'high' OR re.priority = 'medium')
     ORDER BY re.created_at DESC`,
    [cropId]
  );
  
  const events = result.rows;
  
  if (events.length === 0) {
    return {
      available: false,
      totalAlerts: 0,
    };
  }
  
  // Find major challenge (most recent high priority disease)
  const majorChallenge = events.find(e => e.priority === 'high') || events[0];
  
  return {
    available: true,
    totalAlerts: events.length,
    majorChallenge: {
      title: majorChallenge.title,
      description: majorChallenge.body,
      detectedAt: majorChallenge.created_at,
      farmerAction: majorChallenge.followed || 'UNKNOWN',
    },
    events: events.map(e => ({
      title: e.title,
      detectedAt: e.created_at,
      priority: e.priority,
      farmerAction: e.followed || 'UNKNOWN',
    })),
  };
}

/**
 * Get financial summary (predicted vs actual)
 * @param {string} cropId
 * @param {object} season
 * @returns {Promise<object>}
 */
async function getFinancialSummary(cropId, season) {
  // Get sum of predicted revenue impacts for followed recommendations
  const predictedResult = await db.query(
    `SELECT 
      SUM(re.predicted_revenue_impact) as total_predicted_impact
     FROM recommendation_events re
     JOIN farmer_actions fa ON fa.recommendation_id = re.id
     WHERE re.crop_id = $1
       AND fa.followed = 'FOLLOWED'
       AND re.predicted_revenue_impact IS NOT NULL`,
    [cropId]
  );
  
  const predictedImpact = predictedResult.rows[0]?.total_predicted_impact || 0;
  
  // Get actual revenue from grading events
  const gradingResult = await db.query(
    `SELECT 
      ge.grade,
      ge.estimated_market_price,
      ge.graded_at
     FROM grading_events ge
     WHERE ge.crop_id = $1
     ORDER BY ge.graded_at DESC
     LIMIT 1`,
    [cropId]
  );
  
  if (gradingResult.rows.length === 0) {
    return {
      available: false,
      reason: 'Actual sale data has not been recorded.',
    };
  }
  
  const grading = gradingResult.rows[0];
  const actualRevenue = parseFloat(grading.estimated_market_price) || 0;
  
  // Calculate baseline (what revenue would have been without following recommendations)
  // This is a conservative estimate
  const baselineRevenue = actualRevenue - predictedImpact;
  
  return {
    available: true,
    predictedImpact: Math.round(predictedImpact),
    baselineRevenue: Math.round(Math.max(0, baselineRevenue)),
    actualRevenue: Math.round(actualRevenue),
    difference: Math.round(predictedImpact),
    percentageIncrease: baselineRevenue > 0 ? 
      Math.round((predictedImpact / baselineRevenue) * 10000) / 100 : null,
    grade: grading.grade,
  };
}

/**
 * Calculate season score (0-100)
 * @param {object} overview
 * @param {object} adherence
 * @param {object} disease
 * @returns {object}
 */
function calculateSeasonScore(overview, adherence, disease) {
  const components = {};
  let totalWeight = 0;
  let totalScore = 0;
  
  // Component 1: Recommendation adherence (40% weight)
  if (adherence.percentage !== null) {
    const adherenceScore = adherence.percentage; // Already 0-100
    components.recommendationAdherence = {
      score: Math.round(adherenceScore),
      weight: 0.4,
    };
    totalWeight += 0.4;
    totalScore += adherenceScore * 0.4;
  }
  
  // Component 2: Disease response (30% weight)
  if (disease.available && disease.totalAlerts > 0) {
    // Check how many disease alerts got a response
    const respondedAlerts = disease.events.filter(
      e => e.farmerAction === 'FOLLOWED'
    ).length;
    const responseRate = (respondedAlerts / disease.totalAlerts) * 100;
    
    components.diseaseResponse = {
      score: Math.round(responseRate),
      weight: 0.3,
    };
    totalWeight += 0.3;
    totalScore += responseRate * 0.3;
  }
  
  // Component 3: Action tracking (30% weight)
  // Reward farmers who track their actions
  if (overview.recommendations > 0) {
    const trackingRate = ((overview.followed + overview.notFollowed) / overview.recommendations) * 100;
    components.actionTracking = {
      score: Math.round(trackingRate),
      weight: 0.3,
    };
    totalWeight += 0.3;
    totalScore += trackingRate * 0.3;
  }
  
  // Normalize if weights don't sum to 1.0
  if (totalWeight === 0) {
    return {
      available: false,
      reason: 'Insufficient data to calculate season score',
    };
  }
  
  const finalScore = totalScore / totalWeight;
  
  return {
    available: true,
    score: Math.round(finalScore),
    components,
  };
}

/**
 * Generate "what worked" insights
 * @param {object} adherence
 * @param {object} categoryAdherence
 * @param {object} disease
 * @returns {Array<string>}
 */
function generateWhatWorked(adherence, categoryAdherence, disease) {
  const insights = [];
  
  // High overall adherence
  if (adherence.percentage && adherence.percentage >= 75) {
    insights.push(`High recommendation adherence (${Math.round(adherence.percentage)}%) maintained throughout the season.`);
  }
  
  // Category with highest adherence
  const categories = Object.entries(categoryAdherence);
  if (categories.length > 0) {
    const bestCategory = categories
      .filter(([_, data]) => data.percentage !== null)
      .sort((a, b) => b[1].percentage - a[1].percentage)[0];
    
    if (bestCategory && bestCategory[1].percentage >= 80) {
      const categoryName = bestCategory[0].charAt(0).toUpperCase() + bestCategory[0].slice(1);
      insights.push(`${categoryName} recommendations had excellent adherence (${Math.round(bestCategory[1].percentage)}%).`);
    }
  }
  
  // Disease response
  if (disease.available && disease.totalAlerts > 0) {
    const respondedCount = disease.events.filter(
      e => e.farmerAction === 'FOLLOWED'
    ).length;
    if (respondedCount === disease.totalAlerts) {
      insights.push('All disease alerts received timely farmer action.');
    } else if (respondedCount > 0) {
      insights.push(`${respondedCount} of ${disease.totalAlerts} disease alerts received farmer action.`);
    }
  }
  
  return insights;
}

/**
 * Generate "what to improve" insights
 * @param {object} adherence
 * @param {object} categoryAdherence
 * @param {object} overview
 * @returns {Array<string>}
 */
function generateWhatToImprove(adherence, categoryAdherence, overview) {
  const improvements = [];
  
  // Low overall adherence
  if (adherence.percentage && adherence.percentage < 60) {
    improvements.push('Overall recommendation adherence could be improved for better crop outcomes.');
  }
  
  // Category with lowest adherence
  const categories = Object.entries(categoryAdherence);
  if (categories.length > 1) {
    const worstCategory = categories
      .filter(([_, data]) => data.percentage !== null)
      .sort((a, b) => a[1].percentage - b[1].percentage)[0];
    
    if (worstCategory && worstCategory[1].percentage < 70) {
      const categoryName = worstCategory[0].charAt(0).toUpperCase() + worstCategory[0].slice(1);
      improvements.push(`${categoryName} recommendations had lower adherence (${Math.round(worstCategory[1].percentage)}%).`);
    }
  }
  
  // Many unknown actions
  if (overview.unknown > overview.recommendations * 0.3) {
    improvements.push('Recording more actions in the app will help track progress better.');
  }
  
  return improvements;
}

/**
 * Generate next season recommendations
 * @param {object} categoryAdherence
 * @param {object} disease
 * @returns {object}
 */
function generateNextSeason(categoryAdherence, disease) {
  const continueActions = [];
  const improveActions = [];
  const watchActions = [];
  
  // Continue high-performing categories
  const categories = Object.entries(categoryAdherence);
  for (const [category, data] of categories) {
    if (data.percentage && data.percentage >= 75) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      continueActions.push(`Maintain timely ${categoryName.toLowerCase()} practices.`);
    } else if (data.percentage && data.percentage < 60) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      improveActions.push(`Review ${categoryName.toLowerCase()} timing and follow-through.`);
    }
  }
  
  // Watch for recurring diseases
  if (disease.available && disease.totalAlerts > 1) {
    const diseaseTitle = disease.majorChallenge?.title || 'disease issues';
    watchActions.push(`Monitor for ${diseaseTitle.toLowerCase()} earlier in the season.`);
  }
  
  return {
    continue: continueActions,
    improve: improveActions,
    watch: watchActions,
  };
}

/**
 * Generate complete Crop Wrapped report for a season
 * @param {string} cropId
 * @param {string} farmerId - For authorization check
 * @returns {Promise<object>}
 */
async function generateCropWrapped(cropId, farmerId) {
  // Get season data
  const season = await getSeasonData(cropId);
  
  if (!season) {
    throw new Error('SEASON_NOT_FOUND');
  }
  
  // Authorization check
  if (season.farmer_id !== farmerId) {
    throw new Error('UNAUTHORIZED');
  }
  
  // Calculate days tracked
  const daysTracked = calculateDaysTracked(
    season.sow_date,
    season.completed_at,
    season.status
  );
  
  // Get all data
  const overview = await getOverview(cropId);
  const adherence = calculateAdherence(
    overview.followed,
    overview.notFollowed,
    overview.unknown
  );
  const categoryAdherence = await getCategoryAdherence(cropId);
  const disease = await getDiseaseSummary(cropId);
  const financial = await getFinancialSummary(cropId, season);
  const seasonScore = calculateSeasonScore(overview, adherence, disease);
  
  // Generate insights
  const whatWorked = generateWhatWorked(adherence, categoryAdherence, disease);
  const whatToImprove = generateWhatToImprove(adherence, categoryAdherence, overview);
  const nextSeason = generateNextSeason(categoryAdherence, disease);
  
  return {
    success: true,
    season: {
      id: season.id,
      name: getSeasonDisplayName(season),
      crop: season.crop_type,
      variety: season.variety || null,
      startDate: season.sow_date,
      endDate: season.completed_at || null,
      status: season.status,
      daysTracked,
    },
    overview: {
      recommendations: overview.recommendations,
      actionsRecorded: overview.actionsRecorded,
      followed: overview.followed,
      notFollowed: overview.notFollowed,
      unknown: overview.unknown,
      diseaseAlerts: overview.diseaseAlerts,
    },
    adherence: {
      overall: adherence,
      byCategory: categoryAdherence,
    },
    disease,
    financial,
    seasonScore,
    insights: {
      whatWorked,
      whatToImprove,
    },
    nextSeason,
  };
}

module.exports = {
  generateCropWrapped,
  getSeasonData,
  getOverview,
  calculateAdherence,
  getCategoryAdherence,
  getDiseaseSummary,
  getFinancialSummary,
  calculateSeasonScore,
};
