'use strict';

/**
 * services/diseaseFlaggerService.js
 * Interprets disease detection results and determines risk/action flags
 */

const { isUrgent } = require('../config/diseaseKnowledge');
const { 
  HIGH_CONFIDENCE_THRESHOLD, 
  MEDIUM_CONFIDENCE_THRESHOLD 
} = require('./diseaseDetectionService');

/**
 * Generate disease flag and risk assessment
 * @param {object} diseaseInfo - From diseaseDetectionService.mapToDiseaseInfo
 * @returns {object}
 */
function flagDisease(diseaseInfo) {
  const { healthy, confidence, confidenceLevel, disease } = diseaseInfo;

  // ── Case 1: Healthy crop ──
  if (healthy) {
    return {
      status: 'healthy',
      riskLevel: 'low',
      action: 'monitor',
      message: 'Crop appears healthy. Continue regular monitoring.',
      requiresAttention: false
    };
  }

  // ── Case 2: Low confidence ──
  if (confidenceLevel === 'low') {
    return {
      status: 'low_confidence',
      riskLevel: 'unknown',
      action: 'retest',
      message: `Low confidence detection (${Math.round(confidence * 100)}%). Please upload a clearer image for reliable analysis.`,
      requiresAttention: false
    };
  }

  // ── Case 3: Disease detected with sufficient confidence ──
  const urgent = isUrgent(disease);
  
  let riskLevel;
  let action;
  
  if (urgent || confidenceLevel === 'high') {
    riskLevel = 'high';
    action = 'immediate_treatment';
  } else {
    riskLevel = 'medium';
    action = 'attention_required';
  }

  return {
    status: 'disease_detected',
    riskLevel,
    action,
    message: `${disease} detected with ${confidenceLevel} confidence (${Math.round(confidence * 100)}%). ${urgent ? 'Immediate action recommended.' : 'Timely treatment recommended.'}`,
    requiresAttention: true,
    urgent: urgent || false
  };
}

/**
 * Determine priority level for recommendation event
 * @param {object} flag - From flagDisease
 * @returns {'high'|'medium'|'low'}
 */
function getPriority(flag) {
  if (flag.riskLevel === 'high' || flag.urgent) {
    return 'high';
  }
  if (flag.riskLevel === 'medium') {
    return 'medium';
  }
  return 'low';
}

/**
 * Generate recommendation title and body
 * @param {object} diseaseInfo
 * @param {object} flag
 * @returns {{title: string, body: string}}
 */
function generateRecommendationText(diseaseInfo, flag) {
  const { crop, disease, confidence } = diseaseInfo;

  if (flag.status === 'healthy') {
    return {
      title: `${crop} Crop Health Check`,
      body: 'Your crop appears healthy. No disease detected. Continue regular monitoring and preventive practices.'
    };
  }

  if (flag.status === 'low_confidence') {
    return {
      title: 'Image Quality Issue',
      body: `Could not confidently identify crop condition (${Math.round(confidence * 100)}% confidence). Please upload a clearer, well-lit photo of affected leaves for accurate analysis.`
    };
  }

  // Disease detected
  const urgentPrefix = flag.urgent ? '⚠️ URGENT: ' : '';
  const title = `${urgentPrefix}${disease} Detected in ${crop}`;
  const body = `${disease} identified with ${Math.round(confidence * 100)}% confidence. ${flag.urgent ? 'This condition can spread rapidly. ' : ''}Review treatment recommendations and take appropriate action.`;

  return { title, body };
}

module.exports = {
  flagDisease,
  getPriority,
  generateRecommendationText
};
