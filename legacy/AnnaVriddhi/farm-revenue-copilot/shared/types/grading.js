'use strict';

/**
 * shared/types/grading.js
 * Canonical shapes for crop grading request/response objects.
 */

/** @enum {string} — ordered best → worst */
const GradeLevel = {
  A1: 'A1',
  A2: 'A2',
  B1: 'B1',
  B2: 'B2',
  C:  'C',
  D:  'D',
};

/**
 * @typedef {object} GradingResult
 * @property {string}     id
 * @property {string}     cropId
 * @property {GradeLevel} grade
 * @property {number}     score                     0–100
 * @property {object}     breakdown
 * @property {number}     breakdown.color           0–100
 * @property {number}     breakdown.size            0–100
 * @property {number}     breakdown.moisture        0–100
 * @property {number}     breakdown.pestDamage      0–100
 * @property {number}     estimatedMarketPrice
 * @property {string}     currency                  e.g. "INR"
 * @property {string}     unit                      e.g. "quintal"
 * @property {string|null} notes
 * @property {string}     gradedAt                  ISO-8601
 */

/**
 * @typedef {object} GradingSubmitRequest
 * @property {string}  cropId
 * @property {string=} imageUrl    URL of uploaded image (set by server after upload)
 * @property {string=} notes       Farmer's field observation notes
 */

module.exports = { GradeLevel };
