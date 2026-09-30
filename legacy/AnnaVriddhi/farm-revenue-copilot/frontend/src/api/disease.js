/**
 * api/disease.js
 * Disease detection API client
 */

import client from './client';

/**
 * Detect disease from an image
 * @param {File} imageFile - Image file to analyze
 * @param {string} cropId - Optional crop ID
 * @returns {Promise<object>}
 */
export async function detectDisease(imageFile, cropId = null) {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (cropId) {
    formData.append('cropId', cropId);
  }

  const response = await client.post('/disease/detect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Get supported disease classes
 * @returns {Promise<object>}
 */
export async function getSupportedClasses() {
  const response = await client.get('/disease/supported-classes');
  return response.data;
}

/**
 * Check disease detection service health
 * @returns {Promise<object>}
 */
export async function checkHealth() {
  const response = await client.get('/disease/health');
  return response.data;
}
