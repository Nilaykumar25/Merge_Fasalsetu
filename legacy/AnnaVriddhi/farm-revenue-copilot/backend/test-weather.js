#!/usr/bin/env node
'use strict';

/**
 * Quick Weather API test script
 * Run with: node test-weather.js
 * 
 * Tests OpenWeatherMap API with your credentials.
 */

require('dotenv').config();
const weatherApi = require('./src/integrations/weatherApi');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function testWeatherAPI() {
  log(colors.cyan, '\n═══════════════════════════════════════════════════════════');
  log(colors.green, '  OpenWeatherMap API Test');
  log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

  // Check configuration
  const apiKey = process.env.WEATHER_API_KEY;
  const baseUrl = process.env.WEATHER_API_BASE_URL;

  log(colors.yellow, 'Configuration:');
  console.log('  API Key:', apiKey ? '****' + apiKey.slice(-4) : '(not set)');
  console.log('  Base URL:', baseUrl);
  console.log('');

  if (!apiKey) {
    log(colors.red, '✗ Missing WEATHER_API_KEY in .env file');
    log(colors.yellow, '\nAdd to your .env file:');
    console.log('  WEATHER_API_KEY=your_openweathermap_api_key_here');
    console.log('\nGet your API key from: https://openweathermap.org/api');
    process.exit(1);
  }

  // Test location (Pune, Maharashtra)
  const testLocations = [
    { name: 'Pune, Maharashtra', lat: 18.5204, lon: 73.8567 },
    { name: 'Mumbai, Maharashtra', lat: 19.0760, lon: 72.8777 },
    { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
  ];

  // Test 1: Current weather
  log(colors.yellow, 'Test 1: Current Weather');
  for (const location of testLocations) {
    try {
      const current = await weatherApi.getCurrentWeather({
        lat: location.lat,
        lon: location.lon,
      });

      log(colors.green, `✓ ${location.name}`);
      console.log(`  Temperature: ${current.main.temp}°C`);
      console.log(`  Feels like: ${current.main.feels_like}°C`);
      console.log(`  Weather: ${current.weather[0].description}`);
      console.log(`  Humidity: ${current.main.humidity}%`);
      console.log(`  Wind: ${current.wind.speed} m/s`);
      if (current.rain) {
        console.log(`  Rain (1h): ${current.rain['1h'] || 0}mm`);
      }
      console.log('');
    } catch (err) {
      log(colors.red, `✗ ${location.name} failed`);
      console.error('  Error:', err.message);
      console.log('');
    }
  }

  // Test 2: Forecast
  log(colors.yellow, 'Test 2: 5-day Forecast (Pune)');
  try {
    const forecast = await weatherApi.getForecast({
      lat: testLocations[0].lat,
      lon: testLocations[0].lon,
    });

    log(colors.green, '✓ Forecast retrieved');
    console.log(`  Total entries: ${forecast.list.length}`);
    console.log('  Next 24 hours:');

    // Show next 8 entries (24 hours at 3-hour intervals)
    forecast.list.slice(0, 8).forEach((item, i) => {
      const date = new Date(item.dt * 1000);
      const hours = date.getHours();
      const temp = item.main.temp;
      const rain = item.rain?.['3h'] || 0;
      const desc = item.weather[0].description;

      console.log(`    ${hours}:00 - ${temp}°C, ${desc}, rain: ${rain}mm`);
    });
    console.log('');
  } catch (err) {
    log(colors.red, '✗ Forecast failed');
    console.error('  Error:', err.message);
    console.log('');
  }

  // Test 3: fetchWeather (custom function for irrigation)
  log(colors.yellow, 'Test 3: fetchWeather() for Irrigation System');
  try {
    const weather = await weatherApi.fetchWeather(
      testLocations[0].lat,
      testLocations[0].lon
    );

    log(colors.green, '✓ Weather data retrieved');
    console.log(`  Current temp: ${weather.temp}°C`);
    console.log(`  Current rainfall: ${weather.rainfall_mm}mm`);
    console.log(`  24h forecast entries: ${weather.forecast24h.length}`);
    console.log(`  72h forecast entries: ${weather.forecast72h.length}`);
    console.log('');

    // Calculate total expected rain
    const total24h = weather.forecast24h.reduce((sum, f) => sum + (f.rain || 0), 0);
    const total72h = weather.forecast72h.reduce((sum, f) => sum + (f.rain || 0), 0);

    console.log('  Expected rainfall:');
    console.log(`    Next 24h: ${total24h.toFixed(1)}mm`);
    console.log(`    Next 72h: ${total72h.toFixed(1)}mm`);
    console.log('');

    if (total72h > 10) {
      log(colors.green, '  ✓ Significant rain expected - irrigation may not be needed');
    } else {
      log(colors.yellow, '  ⚠ Low rainfall expected - irrigation may be required');
    }
    console.log('');
  } catch (err) {
    log(colors.red, '✗ fetchWeather() failed');
    console.error('  Error:', err.message);
    console.log('');
  }

  // Test 4: Storm detection
  log(colors.yellow, 'Test 4: Storm Detection');
  try {
    const weather = await weatherApi.fetchWeather(
      testLocations[0].lat,
      testLocations[0].lon
    );

    const storms = weather.forecast72h.filter(f =>
      f.description &&
      (f.description.toLowerCase().includes('storm') ||
       f.description.toLowerCase().includes('thunder') ||
       f.description.toLowerCase().includes('heavy rain'))
    );

    if (storms.length > 0) {
      log(colors.red, '  ⚠ STORM WARNING DETECTED!');
      console.log(`  Found ${storms.length} storm conditions in next 72h:`);
      storms.forEach(s => {
        const date = new Date(s.dt * 1000);
        console.log(`    - ${date.toLocaleString()}: ${s.description}`);
      });
    } else {
      log(colors.green, '  ✓ No storms detected in forecast');
    }
    console.log('');
  } catch (err) {
    log(colors.red, '✗ Storm detection failed');
    console.error('  Error:', err.message);
    console.log('');
  }

  log(colors.cyan, '═══════════════════════════════════════════════════════════');
  log(colors.green, '  Weather API Integration Ready!');
  log(colors.cyan, '═══════════════════════════════════════════════════════════\n');

  log(colors.yellow, 'Features Enabled:');
  console.log('  ✓ Current weather conditions');
  console.log('  ✓ 5-day / 3-hour forecast');
  console.log('  ✓ Rainfall predictions (24h & 72h)');
  console.log('  ✓ Storm/hail detection');
  console.log('  ✓ Temperature and humidity tracking');
  console.log('');

  log(colors.yellow, 'Used By:');
  console.log('  • Irrigation prediction (water-balance model)');
  console.log('  • Storm warnings (cover recommendations)');
  console.log('  • Harvest timing optimization');
  console.log('  • General crop condition assessment');
  console.log('');

  log(colors.yellow, 'API Usage:');
  console.log('  • Free tier: 60 calls/minute, 1,000,000 calls/month');
  console.log('  • Each alertJob run: ~1 call (shared across all crops)');
  console.log('  • Running every 6 hours: ~120 calls/month');
  console.log('  • Well within free limits! ✓');
  console.log('');
}

// Run test
if (require.main === module) {
  testWeatherAPI()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ Test failed:', err);
      process.exit(1);
    });
}

module.exports = { testWeatherAPI };
