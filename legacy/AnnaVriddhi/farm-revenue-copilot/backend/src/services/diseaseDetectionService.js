'use strict';

/**
 * services/diseaseDetectionService.js
 * Disease detection using PlantVillage model
 * Modular design allows model replacement without changing API
 */

const axios = require('axios');
const { getClassInfo } = require('../config/diseaseClasses');

// Model provider configuration
const MODEL_PROVIDER_URL = process.env.DISEASE_MODEL_URL || null;
const MODEL_PROVIDER_TYPE = process.env.DISEASE_MODEL_PROVIDER || 'python'; // 'python' | 'onnx' | 'mock'

// Confidence thresholds
const HIGH_CONFIDENCE_THRESHOLD = parseFloat(process.env.DISEASE_CONFIDENCE_HIGH || 0.80);
const MEDIUM_CONFIDENCE_THRESHOLD = parseFloat(process.env.DISEASE_CONFIDENCE_MEDIUM || 0.60);

/**
 * Detect disease from preprocessed image
 * @param {Buffer} imageBuffer - Preprocessed image buffer
 * @returns {Promise<{className: string, confidence: number}>}
 */
async function detectDisease(imageBuffer) {
  if (MODEL_PROVIDER_TYPE === 'mock') {
    return _mockDetection();
  }

  if (MODEL_PROVIDER_TYPE === 'python') {
    return _detectViaPythonService(imageBuffer);
  }

  throw new Error(`Unsupported model provider: ${MODEL_PROVIDER_TYPE}`);
}

/**
 * Detect disease via Python ML service
 * @param {Buffer} imageBuffer
 * @returns {Promise<{className: string, confidence: number}>}
 * @private
 */
async function _detectViaPythonService(imageBuffer) {
  if (!MODEL_PROVIDER_URL) {
    throw new Error('DISEASE_MODEL_URL not configured');
  }

  try {
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'image.jpg');

    const response = await axios.post(
      MODEL_PROVIDER_URL,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000  // 30 second timeout
      }
    );

    if (!response.data || !response.data.class) {
      throw new Error('Invalid response from model service');
    }

    return {
      className: response.data.class,
      confidence: response.data.confidence || 0
    };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      throw new Error('MODEL_UNAVAILABLE: Cannot connect to disease detection service');
    }
    throw err;
  }
}

/**
 * Mock detection for development (MUST BE DISABLED IN PRODUCTION)
 * @returns {Promise<{className: string, confidence: number}>}
 * @private
 */
async function _mockDetection() {
  // WARNING: This is a mock implementation for development ONLY
  // Never enable this in production
  console.warn('[diseaseDetectionService] WARNING: Using MOCK detection');
  
  const mockClasses = [
    { className: 'Tomato___Early_blight', confidence: 0.91 },
    { className: 'Tomato___healthy', confidence: 0.95 },
    { className: 'Corn_(maize)___Common_rust_', confidence: 0.87 },
    { className: 'Potato___Late_blight', confidence: 0.89 }
  ];

  // Return a random mock result
  const result = mockClasses[Math.floor(Math.random() * mockClasses.length)];
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return result;
}

/**
 * Get confidence level category
 * @param {number} confidence
 * @returns {'high'|'medium'|'low'}
 */
function getConfidenceLevel(confidence) {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'high';
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
  return 'low';
}

/**
 * Map model output to structured disease information
 * @param {string} className
 * @param {number} confidence
 * @returns {object}
 */
function mapToDiseaseInfo(className, confidence) {
  const classInfo = getClassInfo(className);
  
  if (!classInfo) {
    throw new Error(`UNKNOWN_CLASS: Model returned unknown class "${className}"`);
  }

  const confidenceLevel = getConfidenceLevel(confidence);

  return {
    className,
    crop: classInfo.crop,
    disease: classInfo.disease,
    healthy: classInfo.healthy,
    confidence,
    confidenceLevel,
    category: classInfo.category,
    scientificName: classInfo.scientificName
  };
}

/**
 * Check if model is available
 * @returns {Promise<boolean>}
 */
async function isModelAvailable() {
  if (MODEL_PROVIDER_TYPE === 'mock') {
    return true;
  }

  if (!MODEL_PROVIDER_URL) {
    return false;
  }

  try {
    // Derive base URL from MODEL_PROVIDER_URL (strip the /predict path)
    const baseUrl = MODEL_PROVIDER_URL.replace(/\/predict\/?$/, '');
    await axios.get(`${baseUrl}/health`, { timeout: 5000 });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get model configuration info
 * @returns {object}
 */
function getModelInfo() {
  return {
    provider: MODEL_PROVIDER_TYPE,
    url: MODEL_PROVIDER_URL || 'not configured',
    highConfidenceThreshold: HIGH_CONFIDENCE_THRESHOLD,
    mediumConfidenceThreshold: MEDIUM_CONFIDENCE_THRESHOLD
  };
}

module.exports = {
  detectDisease,
  getConfidenceLevel,
  mapToDiseaseInfo,
  isModelAvailable,
  getModelInfo,
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD
};
