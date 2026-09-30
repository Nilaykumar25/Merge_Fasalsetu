/**
 * api/grading.js
 * Crop grading — submit observation data, retrieve grade results.
 */
import client from './client.js';

/**
 * Submit a new grading observation (image + field notes).
 * @param {FormData} formData  Must include: cropId, image (file), notes (optional)
 */
export async function submitGrading(formData) {
  const { data } = await client.post('/grading', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Get the latest grading result for a crop.
 * @param {string} cropId
 */
export async function getGradingResult(cropId) {
  const { data } = await client.get(`/grading/${cropId}/latest`);
  return data;
}

/**
 * Get full grading history for a crop.
 * @param {string} cropId
 */
export async function getGradingHistory(cropId) {
  const { data } = await client.get(`/grading/${cropId}/history`);
  return data;
}
