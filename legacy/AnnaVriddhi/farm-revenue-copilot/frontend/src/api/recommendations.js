/**
 * api/recommendations.js
 * All calls related to crop recommendations.
 */
import client from './client.js';

/**
 * Fetch recommendations for a specific crop.
 * @param {string} cropId
 * @returns {Promise<import('../../shared/types/recommendations').Recommendation[]>}
 */
export async function getRecommendations(cropId) {
  const { data } = await client.get(`/recommendations/${cropId}`);
  return data;
}

/**
 * Log that the farmer acknowledged / acted on a recommendation.
 * @param {string} recommendationId
 * @param {{ action: string, notes?: string }} payload
 */
export async function acknowledgeRecommendation(recommendationId, payload) {
  const { data } = await client.post(
    `/recommendations/${recommendationId}/acknowledge`,
    payload
  );
  return data;
}
