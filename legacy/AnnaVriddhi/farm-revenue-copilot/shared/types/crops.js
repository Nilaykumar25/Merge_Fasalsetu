'use strict';

/**
 * shared/types/crops.js
 * Canonical crop and farmer profile shapes.
 */

/** @enum {string} */
const CropStatus = {
  ACTIVE:    'active',
  HARVESTED: 'harvested',
  FAILED:    'failed',
};

/** @enum {string} */
const IrrigationMethod = {
  DRIP:      'drip',
  SPRINKLER: 'sprinkler',
  FLOOD:     'flood',
  MANUAL:    'manual',
};

/**
 * @typedef {object} Crop
 * @property {string}      id
 * @property {string}      farmerId
 * @property {string}      cropType        e.g. "wheat", "rice", "cotton"
 * @property {string=}     variety
 * @property {string}      sowDate         ISO-8601 date
 * @property {string=}     expectedHarvestDate
 * @property {number}      areaAc          acres
 * @property {CropStatus}  status
 * @property {string}      createdAt
 */

/**
 * @typedef {object} CropStateSnapshot
 * @property {string} cropId
 * @property {number} score                 0–100
 * @property {number} soilMoisturePct
 * @property {number} leafColorScore
 * @property {number} pestPressureScore
 * @property {number} growthStagePct
 * @property {string} computedAt            ISO-8601
 */

module.exports = { CropStatus, IrrigationMethod };
