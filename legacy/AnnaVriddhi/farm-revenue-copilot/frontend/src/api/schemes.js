/**
 * api/schemes.js
 * Government / bank scheme eligibility and matching.
 */
import client from './client.js';

/**
 * Get all schemes the farmer is eligible for.
 * @param {{ state: string, cropType: string, landArea: number }} params
 */
export async function getMatchedSchemes(params) {
  const { data } = await client.get('/schemes/match', { params });
  return data;
}

/**
 * Get details for a single scheme.
 * @param {string} schemeId
 */
export async function getSchemeDetail(schemeId) {
  const { data } = await client.get(`/schemes/${schemeId}`);
  return data;
}
