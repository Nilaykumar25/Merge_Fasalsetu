'use strict';

/**
 * shared/types/schemes.js
 * Canonical shapes for government/bank scheme objects.
 */

/** @enum {string} */
const SchemeType = {
  INCOME_SUPPORT: 'income_support',
  CROP_INSURANCE: 'crop_insurance',
  LOAN:           'loan',
  SUBSIDY:        'subsidy',
};

/**
 * @typedef {object} Scheme
 * @property {string}     id
 * @property {string}     name
 * @property {string}     provider
 * @property {SchemeType} type
 * @property {string}     benefit         Human-readable benefit description
 * @property {string[]}   eligibility     Plain-language eligibility criteria
 * @property {string[]|null} statesEligible  null = nationwide
 * @property {string[]|null} cropsEligible   null = all crops
 * @property {string}     applyUrl
 * @property {string|null} deadline        ISO-8601 date or null
 */

/**
 * @typedef {object} SchemeMatchRequest
 * @property {string} state
 * @property {string} cropType
 * @property {number} landArea   acres
 */

module.exports = { SchemeType };
