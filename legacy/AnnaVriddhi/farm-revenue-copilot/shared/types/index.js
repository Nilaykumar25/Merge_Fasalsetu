'use strict';

/**
 * shared/types/index.js
 * Barrel export — import everything from here.
 *
 * Usage (Node/CommonJS):
 *   const { RecommendationType, GradeLevel } = require('../../shared/types');
 *
 * Usage (ES modules / frontend via alias):
 *   import { RecommendationType, GradeLevel } from '@shared/types';
 */

const { RecommendationType, RecommendationPriority, RecommendationStatus } = require('./recommendations');
const { GradeLevel }                 = require('./grading');
const { SchemeType }                 = require('./schemes');
const { CropStatus, IrrigationMethod } = require('./crops');

module.exports = {
  // Recommendations
  RecommendationType,
  RecommendationPriority,
  RecommendationStatus,

  // Grading
  GradeLevel,

  // Schemes
  SchemeType,

  // Crops
  CropStatus,
  IrrigationMethod,
};
