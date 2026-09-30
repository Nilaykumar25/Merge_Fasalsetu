/**
 * api/irrigation.js
 * Irrigation schedule and event logging
 */
import client from './client.js';

/**
 * Get irrigation schedule for a crop
 * @param {string} cropId
 */
export async function getIrrigationSchedule(cropId) {
  const { data } = await client.get(`/irrigation/${cropId}`);
  return data;
}

/**
 * Log an irrigation event
 * @param {string} cropId
 * @param {{ date?: string, amountMm: number, method?: string, notes?: string }} eventData
 */
export async function logIrrigationEvent(cropId, eventData) {
  const { data } = await client.post(`/irrigation/${cropId}`, eventData);
  return data;
}
