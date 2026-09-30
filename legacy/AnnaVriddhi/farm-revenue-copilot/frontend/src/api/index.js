/**
 * api/index.js
 * Central export point for all API functions
 */

// Re-export all API functions
export * from './recommendations.js';
export * from './grading.js';
export * from './schemes.js';
export * from './irrigation.js';
export * from './cropWrapped.js';
export * from './weather.js';
export * from './disease.js';

// Export client for custom requests
export { default as client } from './client.js';
