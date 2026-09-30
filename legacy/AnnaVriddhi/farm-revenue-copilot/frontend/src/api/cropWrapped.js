/**
 * api/cropWrapped.js
 * Crop Wrapped / Season Review API
 */
import client from './client.js';

/**
 * Get Crop Wrapped report for a season
 * @param {string} cropId
 */
export async function getCropWrappedReport(cropId) {
  const { data } = await client.get(`/crop-wrapped/${cropId}`);
  return data;
}

/**
 * Get all seasons for a farmer
 * @param {string} farmerId
 */
export async function getFarmerSeasons(farmerId) {
  const { data } = await client.get(`/crop-wrapped/farmer/${farmerId}/seasons`);
  return data;
}

/**
 * Log farmer action for a recommendation
 * @param {{ recommendationId: string, cropId: string, followed: 'FOLLOWED'|'NOT_FOLLOWED'|'UNKNOWN', actionDetail?: string }} actionData
 */
export async function logFarmerAction(actionData) {
  const { data } = await client.post('/crop-wrapped/actions', actionData);
  return data;
}
