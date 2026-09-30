'use strict';

/**
 * shared/types/recommendations.js
 * Canonical shapes for recommendation request/response objects.
 * Both frontend (api/recommendations.js) and backend (routes/recommendations.js)
 * import enums and JSDoc types from here.
 */

/** @enum {string} */
const RecommendationType = {
  IRRIGATION:  'irrigation',
  FERTILIZER:  'fertilizer',
  PESTICIDE:   'pesticide',
  HARVEST:     'harvest',
  SCHEME:      'scheme',
  SOIL:        'soil',
};

/** @enum {string} */
const RecommendationPriority = {
  HIGH:   'high',
  MEDIUM: 'medium',
  LOW:    'low',
};

/** @enum {string} */
const RecommendationStatus = {
  PENDING:      'pending',
  ACKNOWLEDGED: 'acknowledged',
  ACTED:        'acted',
  DISMISSED:    'dismissed',
};

/**
 * @typedef {object} Recommendation
 * @property {string}                 id
 * @property {string}                 cropId
 * @property {RecommendationType}     type
 * @property {RecommendationPriority} priority
 * @property {string}                 title
 * @property {string}                 body
 * @property {RecommendationStatus}   status
 * @property {string}                 createdAt   ISO-8601
 * @property {string|null}            acknowledgedAt
 */

/**
 * @typedef {object} AcknowledgeRequest
 * @property {string}  action   short description of what the farmer did
 * @property {string=} notes
 */

module.exports = { RecommendationType, RecommendationPriority, RecommendationStatus };
