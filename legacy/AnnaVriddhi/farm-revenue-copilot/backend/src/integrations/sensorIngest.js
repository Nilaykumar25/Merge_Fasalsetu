'use strict';

/**
 * integrations/sensorIngest.js
 * Entry point for IoT / field-sensor data.
 * Normalises payloads from different sensor vendors into a common shape
 * and persists raw readings for the scoring pipeline to consume.
 */

/**
 * Common sensor reading shape (internal)
 * @typedef {{
 *   cropId: string,
 *   sensorId: string,
 *   timestamp: string,   // ISO-8601
 *   soilMoisturePct?: number,
 *   soilTemperatureC?: number,
 *   airTemperatureC?: number,
 *   humidityPct?: number,
 *   lightLux?: number,
 *   rawPayload: object
 * }} SensorReading
 */

/**
 * Ingest a sensor payload, normalise it, and store it.
 * @param {object} rawPayload  Vendor-specific JSON body
 * @param {string} vendorType  e.g. "generic" | "FieldSense" | "AgroStar"
 * @returns {Promise<SensorReading>}
 */
async function ingest(rawPayload, vendorType = 'generic') {
  const normalised = _normalise(rawPayload, vendorType);
  // TODO: persist to sensor_readings table / time-series store
  return normalised;
}

/**
 * Fetch the latest moisture reading for a specific crop.
 * @param {string} cropId - UUID of the crop
 * @returns {Promise<{ soil_moisture_pct: number, timestamp: string } | null>}
 */
async function fetchMoisture(cropId) {
  try {
    // TODO: Replace with actual sensor hardware query
    // For now, return simulated data based on cropId to make testing predictable
    
    // Simulate occasional sensor failures (10% of the time)
    if (Math.random() < 0.1) {
      throw new Error('Sensor communication timeout');
    }
    
    // Return mock data with some variation
    const baseValue = 50 + (cropId.charCodeAt(0) % 40); // 50-90% range based on crop ID
    return {
      soil_moisture_pct: parseFloat(baseValue.toFixed(2)),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[sensorIngest] Failed to fetch moisture for crop ${cropId}:`, err.message);
    return null;
  }
}

function _normalise(payload, vendorType) {
  // Generic passthrough — extend with vendor-specific transformers
  return {
    cropId:           payload.cropId || payload.crop_id,
    sensorId:         payload.sensorId || payload.sensor_id || 'unknown',
    timestamp:        payload.timestamp || new Date().toISOString(),
    soilMoisturePct:  payload.soilMoisture ?? payload.soil_moisture_pct,
    soilTemperatureC: payload.soilTemp ?? payload.soil_temperature_c,
    airTemperatureC:  payload.airTemp ?? payload.air_temperature_c,
    humidityPct:      payload.humidity ?? payload.humidity_pct,
    lightLux:         payload.light ?? payload.light_lux,
    rawPayload:       payload,
    vendorType,
  };
}

module.exports = { ingest, fetchMoisture };
