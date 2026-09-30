/**
 * Weather Protection Service
 * Risk analysis for hail, heavy rain, wind, extreme temperatures
 */

const axios = require('axios');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE_URL = process.env.WEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5';

/**
 * Analyze weather risk
 * @param {Object} params
 * @param {Object} params.location - { lat, lon }
 * @param {string} params.crop - Crop type
 * @param {number} params.cropValue - Estimated crop value (₹)
 * @returns {Promise<Object>} Weather protection decision
 */
async function analyzeWeatherRisk(params) {
  const { location, crop, cropValue = 0 } = params;

  if (!location || !location.lat || !location.lon) {
    throw new Error('Location coordinates required');
  }

  // Fetch weather forecast
  let forecast;
  try {
    forecast = await getWeatherForecast(location);
  } catch (err) {
    console.error('[WeatherProtection] Failed to fetch forecast:', err.message);
    return {
      type: 'WEATHER_PROTECTION',
      severity: 'UNKNOWN',
      alert: 'Unable to fetch weather data',
      recommendation: 'Check weather manually',
      error: err.message
    };
  }

  // Calculate risk score
  const riskAnalysis = calculateWeatherRisk(forecast, crop);
  
  // Determine severity and recommendations
  let severity = 'NORMAL';
  let alert = 'Weather conditions normal';
  let recommendation = 'Continue regular farm operations';
  let actions = [];

  if (riskAnalysis.score >= 61) {
    severity = 'HIGH';
    alert = `${riskAnalysis.primaryThreat} risk in next 24 hours`;
    recommendation = 'Take immediate protective action';
    actions = riskAnalysis.actions;
  } else if (riskAnalysis.score >= 31) {
    severity = 'MEDIUM';
    alert = `${riskAnalysis.primaryThreat} risk possible`;
    recommendation = 'Prepare protective measures';
    actions = riskAnalysis.actions;
  } else if (riskAnalysis.score > 0) {
    severity = 'LOW';
    alert = 'Minor weather concerns';
    recommendation = 'Monitor weather updates';
    actions = riskAnalysis.actions;
  }

  // Calculate protection cost and expected damage
  const economics = calculateProtectionEconomics(riskAnalysis, cropValue);

  return {
    type: 'WEATHER_PROTECTION',
    severity,
    alert,
    recommendation,
    reason: riskAnalysis.reasons.join('; '),
    actions,
    metadata: {
      riskScore: riskAnalysis.score,
      primaryThreat: riskAnalysis.primaryThreat,
      forecast: {
        temperature: forecast.temp,
        humidity: forecast.humidity,
        windSpeed: forecast.windSpeed,
        precipitation: forecast.precipitation,
        description: forecast.description
      },
      risks: riskAnalysis.risks,
      economics
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Fetch weather forecast from OpenWeatherMap
 */
async function getWeatherForecast({ lat, lon }) {
  if (!WEATHER_API_KEY) {
    throw new Error('WEATHER_API_KEY not configured');
  }

  const url = `${WEATHER_API_BASE_URL}/forecast`;
  const response = await axios.get(url, {
    params: {
      lat,
      lon,
      appid: WEATHER_API_KEY,
      units: 'metric',
      cnt: 8 // Next 24 hours (3-hour intervals)
    },
    timeout: 10000
  });

  const list = response.data.list;
  
  // Aggregate forecast data
  const temps = list.map(item => item.main.temp);
  const humidity = list.reduce((sum, item) => sum + item.main.humidity, 0) / list.length;
  const windSpeeds = list.map(item => item.wind.speed);
  const rain = list.reduce((sum, item) => sum + (item.rain?.['3h'] || 0), 0);
  const snow = list.reduce((sum, item) => sum + (item.snow?.['3h'] || 0), 0);
  
  // Check for severe weather conditions
  const conditions = list.map(item => item.weather[0]);
  const hasThunderstorm = conditions.some(c => c.main === 'Thunderstorm');
  const hasHail = conditions.some(c => c.description.toLowerCase().includes('hail'));
  const hasHeavyRain = conditions.some(c => c.description.toLowerCase().includes('heavy'));

  return {
    temp: {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((a, b) => a + b, 0) / temps.length
    },
    humidity,
    windSpeed: {
      max: Math.max(...windSpeeds),
      avg: windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length
    },
    precipitation: {
      rain,
      snow,
      total: rain + snow
    },
    description: conditions[0].description,
    conditions: {
      hasThunderstorm,
      hasHail,
      hasHeavyRain
    }
  };
}

/**
 * Calculate weather risk score (0-100)
 */
function calculateWeatherRisk(forecast, crop) {
  let score = 0;
  const risks = [];
  const reasons = [];
  const actions = [];
  let primaryThreat = 'Adverse weather';

  // Hail risk (highest priority)
  if (forecast.conditions.hasHail) {
    score += 50;
    risks.push({ type: 'HAIL', severity: 'HIGH', probability: 80 });
    reasons.push('Hail forecast detected');
    actions.push('Deploy protective netting immediately');
    actions.push('Move harvested produce to covered storage');
    primaryThreat = 'Hail';
  } else if (forecast.conditions.hasThunderstorm) {
    score += 30;
    risks.push({ type: 'HAIL', severity: 'MEDIUM', probability: 40 });
    reasons.push('Thunderstorm may bring hail');
    actions.push('Prepare protective netting');
    primaryThreat = 'Thunderstorm';
  }

  // Wind damage
  if (forecast.windSpeed.max > 50) {
    score += 40;
    risks.push({ type: 'WIND', severity: 'HIGH', windSpeed: forecast.windSpeed.max });
    reasons.push(`Strong winds up to ${Math.round(forecast.windSpeed.max)} km/h`);
    actions.push('Stake tall plants');
    actions.push('Secure greenhouse structures');
    if (!primaryThreat || primaryThreat === 'Adverse weather') primaryThreat = 'High winds';
  } else if (forecast.windSpeed.max > 30) {
    score += 20;
    risks.push({ type: 'WIND', severity: 'MEDIUM', windSpeed: forecast.windSpeed.max });
    reasons.push(`Moderate winds up to ${Math.round(forecast.windSpeed.max)} km/h`);
  }

  // Heavy rain / flooding
  if (forecast.precipitation.rain > 50) {
    score += 35;
    risks.push({ type: 'HEAVY_RAIN', severity: 'HIGH', amount: forecast.precipitation.rain });
    reasons.push(`Heavy rainfall expected (${Math.round(forecast.precipitation.rain)}mm)`);
    actions.push('Ensure drainage channels are clear');
    actions.push('Delay irrigation');
    if (!primaryThreat || primaryThreat === 'Adverse weather') primaryThreat = 'Heavy rain';
  } else if (forecast.precipitation.rain > 25) {
    score += 15;
    risks.push({ type: 'HEAVY_RAIN', severity: 'MEDIUM', amount: forecast.precipitation.rain });
    reasons.push(`Moderate rainfall expected (${Math.round(forecast.precipitation.rain)}mm)`);
  }

  // Temperature extremes
  if (forecast.temp.max > 40) {
    score += 25;
    risks.push({ type: 'HEAT', severity: 'HIGH', temperature: forecast.temp.max });
    reasons.push(`Extreme heat expected (${Math.round(forecast.temp.max)}°C)`);
    actions.push('Increase irrigation frequency');
    actions.push('Consider shade netting for sensitive crops');
    if (!primaryThreat || primaryThreat === 'Adverse weather') primaryThreat = 'Extreme heat';
  } else if (forecast.temp.min < 5) {
    score += 30;
    risks.push({ type: 'FROST', severity: 'HIGH', temperature: forecast.temp.min });
    reasons.push(`Frost risk (${Math.round(forecast.temp.min)}°C)`);
    actions.push('Apply frost protection measures');
    actions.push('Consider smoke pots or heaters');
    if (!primaryThreat || primaryThreat === 'Adverse weather') primaryThreat = 'Frost';
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    score,
    primaryThreat,
    risks,
    reasons,
    actions: [...new Set(actions)] // Remove duplicates
  };
}

/**
 * Calculate protection economics
 */
function calculateProtectionEconomics(riskAnalysis, cropValue) {
  if (riskAnalysis.score === 0 || cropValue === 0) {
    return null;
  }

  // Estimate damage percentage based on risk
  let damagePercent = 0;
  if (riskAnalysis.score >= 61) {
    damagePercent = 30; // 30% expected damage for HIGH risk
  } else if (riskAnalysis.score >= 31) {
    damagePercent = 15; // 15% for MEDIUM risk
  } else {
    damagePercent = 5; // 5% for LOW risk
  }

  const expectedLoss = Math.round(cropValue * (damagePercent / 100));
  
  // Estimate protection cost (roughly 15-20% of potential loss)
  const protectionCost = Math.round(expectedLoss * 0.18);
  
  const netValueProtected = expectedLoss - protectionCost;

  return {
    cropValue,
    expectedDamagePercent: damagePercent,
    expectedLoss,
    protectionCost,
    netValueProtected: Math.max(0, netValueProtected)
  };
}

module.exports = {
  analyzeWeatherRisk
};
