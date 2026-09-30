'use strict';

/**
 * integrations/weatherApi.js
 * Wrapper around OpenWeatherMap (or compatible) API.
 * All other modules import from here — never call weather API directly.
 */

const https = require('https');

const BASE_URL = process.env.WEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5';
const API_KEY  = process.env.WEATHER_API_KEY || '';

/**
 * Fetch current weather for a lat/lon location.
 * @param {{ lat: number, lon: number }} coords
 * @returns {Promise<object>} OpenWeatherMap current-weather response
 */
async function getCurrentWeather({ lat, lon }) {
  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  return _get(url);
}

/**
 * Fetch 5-day / 3-hour forecast for a lat/lon location.
 * @param {{ lat: number, lon: number }} coords
 */
async function getForecast({ lat, lon }) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  return _get(url);
}

/**
 * Fetch weather data for use in crop recommendation logic.
 * Returns current conditions plus forecast summaries.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude  
 * @returns {Promise<{ temp: number, rainfall_mm: number, forecast24h: object, forecast72h: object }>}
 */
async function fetchWeather(lat, lon) {
  try {
    const [current, forecast] = await Promise.all([
      getCurrentWeather({ lat, lon }),
      getForecast({ lat, lon }),
    ]);

    // Extract current temperature and recent rainfall
    const temp = current.main?.temp || 0;
    const rainfall_mm = current.rain?.['1h'] || current.rain?.['3h'] || 0;

    // Summarize 24h forecast (next 8 entries = 24 hours of 3-hour intervals)
    const forecast24h = forecast.list?.slice(0, 8).map(f => ({
      dt: f.dt,
      temp: f.main.temp,
      rain: f.rain?.['3h'] || 0,
      description: f.weather?.[0]?.description,
    })) || [];

    // Summarize 72h forecast (next 24 entries = 72 hours)
    const forecast72h = forecast.list?.slice(0, 24).map(f => ({
      dt: f.dt,
      temp: f.main.temp,
      rain: f.rain?.['3h'] || 0,
      description: f.weather?.[0]?.description,
    })) || [];

    return {
      temp,
      rainfall_mm,
      forecast24h,
      forecast72h,
    };
  } catch (err) {
    console.error('[weatherApi] Failed to fetch weather:', err.message);
    // Return default values on failure
    return {
      temp: 25,
      rainfall_mm: 0,
      forecast24h: [],
      forecast72h: [],
    };
  }
}

function _get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 400) {
            reject(new Error(`Weather API error ${res.statusCode}: ${parsed.message}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

module.exports = { getCurrentWeather, getForecast, fetchWeather };
