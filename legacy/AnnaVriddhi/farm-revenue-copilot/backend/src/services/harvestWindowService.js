/**
 * Harvest Window Service
 * Determines optimal harvest timing based on ripeness, weather, and quality
 */

const axios = require('axios');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE_URL = process.env.WEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5';

// Harvest readiness thresholds by crop
const HARVEST_THRESHOLDS = {
  tomato: { min: 85, optimal: 92 },
  wheat: { min: 88, optimal: 95 },
  rice: { min: 90, optimal: 95 },
  potato: { min: 80, optimal: 90 },
  default: { min: 85, optimal: 92 }
};

/**
 * Analyze harvest window
 * @param {Object} params
 * @param {string} params.crop - Crop type
 * @param {number} params.ripeness - Ripeness percentage (0-100)
 * @param {string} params.grade - Quality grade (A/B/C)
 * @param {number} params.defectRisk - Defect risk score (0-100)
 * @param {Object} params.location - { lat, lon }
 * @returns {Promise<Object>} Harvest window decision
 */
async function analyzeHarvestWindow(params) {
  const { crop, ripeness, grade, defectRisk = 0, location } = params;

  const thresholds = HARVEST_THRESHOLDS[crop] || HARVEST_THRESHOLDS.default;

  // Check ripeness status
  if (ripeness === null || ripeness === undefined) {
    return {
      type: 'HARVEST_WINDOW',
      severity: 'UNKNOWN',
      alert: 'Ripeness data unavailable',
      recommendation: 'Manual inspection required',
      reason: 'No crop maturity data'
    };
  }

  if (ripeness < thresholds.min) {
    return {
      type: 'HARVEST_WINDOW',
      severity: 'NORMAL',
      alert: 'Crop not ready for harvest',
      recommendation: 'Continue monitoring',
      reason: `Current maturity: ${ripeness}%, harvest threshold: ${thresholds.min}%`,
      metadata: {
        ripeness,
        threshold: thresholds.min,
        daysToHarvest: estimateDaysToHarvest(ripeness, thresholds.min)
      }
    };
  }

  // Fetch weather to check for severe conditions
  let weatherRisk = null;
  if (location) {
    try {
      weatherRisk = await checkWeatherRisk(location);
    } catch (err) {
      console.error('[HarvestWindow] Weather check failed:', err.message);
    }
  }

  // Calculate harvest urgency
  const urgency = calculateHarvestUrgency({
    ripeness,
    optimal: thresholds.optimal,
    grade,
    defectRisk,
    weatherRisk
  });

  return {
    type: 'HARVEST_WINDOW',
    severity: urgency.severity,
    alert: urgency.alert,
    recommendation: urgency.recommendation,
    reason: urgency.reason,
    actions: urgency.actions,
    metadata: {
      ripeness,
      grade,
      defectRisk,
      optimalRipeness: thresholds.optimal,
      weatherRisk,
      harvestWindow: urgency.window,
      expectedMaturity: urgency.expectedMaturity
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Check weather risk in next 48 hours
 */
async function checkWeatherRisk({ lat, lon }) {
  if (!WEATHER_API_KEY) {
    return null;
  }

  try {
    const url = `${WEATHER_API_BASE_URL}/forecast`;
    const response = await axios.get(url, {
      params: {
        lat,
        lon,
        appid: WEATHER_API_KEY,
        units: 'metric',
        cnt: 16 // Next 48 hours
      },
      timeout: 10000
    });

    const list = response.data.list;
    const conditions = list.map(item => item.weather[0]);
    
    const hasHail = conditions.some(c => c.description.toLowerCase().includes('hail'));
    const hasThunderstorm = conditions.some(c => c.main === 'Thunderstorm');
    const hasHeavyRain = list.some(item => (item.rain?.['3h'] || 0) > 20);
    const hasHighWind = list.some(item => item.wind.speed > 40);

    if (hasHail) {
      return { level: 'SEVERE', threat: 'Hail forecast', priority: 'CRITICAL' };
    } else if (hasThunderstorm || hasHeavyRain) {
      return { level: 'HIGH', threat: 'Heavy rain/storm', priority: 'HIGH' };
    } else if (hasHighWind) {
      return { level: 'MEDIUM', threat: 'Strong winds', priority: 'MEDIUM' };
    }

    return { level: 'LOW', threat: 'Normal conditions', priority: 'NORMAL' };
  } catch (err) {
    console.error('[HarvestWindow] Weather API error:', err.message);
    return null;
  }
}

/**
 * Calculate harvest urgency
 */
function calculateHarvestUrgency(params) {
  const { ripeness, optimal, grade, defectRisk, weatherRisk } = params;

  // Critical: Severe weather coming
  if (weatherRisk && weatherRisk.priority === 'CRITICAL') {
    return {
      severity: 'HIGH',
      alert: '🌾 Harvest window detected',
      recommendation: 'HARVEST IMMEDIATELY - within 24 hours',
      reason: `${weatherRisk.threat} forecast tomorrow. Current maturity: ${ripeness}%`,
      actions: [
        'Mobilize harvest crew immediately',
        'Prepare storage facilities',
        'Arrange transport'
      ],
      window: '0-24 hours',
      expectedMaturity: ripeness
    };
  }

  // High priority: Severe weather + good maturity
  if (weatherRisk && weatherRisk.priority === 'HIGH' && ripeness >= optimal - 5) {
    return {
      severity: 'HIGH',
      alert: 'Optimal harvest window',
      recommendation: 'Harvest within 24-48 hours',
      reason: `${weatherRisk.threat} expected. Current maturity: ${ripeness}%, optimal: ${optimal}%`,
      actions: [
        'Schedule harvest crew',
        'Check equipment readiness',
        'Monitor weather updates'
      ],
      window: '24-48 hours',
      expectedMaturity: Math.min(ripeness + 2, 100)
    };
  }

  // High defect risk
  if (defectRisk > 70 && ripeness >= optimal - 8) {
    return {
      severity: 'HIGH',
      alert: 'Defect risk increasing',
      recommendation: 'Harvest within 1-2 days',
      reason: `High defect risk (${defectRisk}/100). Current maturity: ${ripeness}%`,
      actions: [
        'Harvest before quality degrades further',
        'Grade carefully to maximize value'
      ],
      window: '1-2 days',
      expectedMaturity: Math.min(ripeness + 3, 100)
    };
  }

  // Optimal ripeness reached
  if (ripeness >= optimal) {
    return {
      severity: 'MEDIUM',
      alert: 'Crop at optimal maturity',
      recommendation: 'Harvest within 2-4 days',
      reason: `Maturity: ${ripeness}%, optimal: ${optimal}%${grade === 'A' ? ' - Premium quality' : ''}`,
      actions: [
        'Plan harvest schedule',
        'Ensure storage capacity available'
      ],
      window: '2-4 days',
      expectedMaturity: ripeness
    };
  }

  // Near optimal
  if (ripeness >= optimal - 5) {
    return {
      severity: 'LOW',
      alert: 'Approaching optimal maturity',
      recommendation: 'Harvest window: 3-5 days',
      reason: `Current maturity: ${ripeness}%, expected optimal in 2-3 days`,
      actions: [
        'Monitor ripeness daily',
        'Prepare harvest logistics'
      ],
      window: '3-5 days',
      expectedMaturity: Math.min(ripeness + 4, 100)
    };
  }

  // Ready but not optimal yet
  return {
    severity: 'LOW',
    alert: 'Harvest possible',
    recommendation: 'Monitor for optimal timing',
    reason: `Crop harvestable but not optimal. Current: ${ripeness}%, optimal: ${optimal}%`,
    actions: [
      'Continue monitoring',
      'Harvest only if necessary'
    ],
    window: '5-7 days',
    expectedMaturity: Math.min(ripeness + 6, 100)
  };
}

/**
 * Estimate days to harvest readiness
 */
function estimateDaysToHarvest(current, threshold) {
  // Assume ~3% ripening per day (varies by crop)
  const gap = threshold - current;
  return Math.ceil(gap / 3);
}

module.exports = {
  analyzeHarvestWindow
};
