'use strict';

/**
 * __tests__/cropWrappedService.test.js
 * Unit tests for Crop Wrapped service
 */

const cropWrappedService = require('../cropWrappedService');

describe('cropWrappedService', () => {
  describe('calculateAdherence', () => {
    test('calculates adherence correctly with known actions', () => {
      const result = cropWrappedService.calculateAdherence(29, 5, 3);
      
      expect(result.followed).toBe(29);
      expect(result.notFollowed).toBe(5);
      expect(result.unknown).toBe(3);
      expect(result.knownActions).toBe(34);
      expect(result.percentage).toBeCloseTo(85.29, 2);
    });
    
    test('handles 100% adherence', () => {
      const result = cropWrappedService.calculateAdherence(10, 0, 2);
      
      expect(result.knownActions).toBe(10);
      expect(result.percentage).toBe(100);
    });
    
    test('handles 0% adherence', () => {
      const result = cropWrappedService.calculateAdherence(0, 10, 5);
      
      expect(result.knownActions).toBe(10);
      expect(result.percentage).toBe(0);
    });
    
    test('handles no known actions', () => {
      const result = cropWrappedService.calculateAdherence(0, 0, 10);
      
      expect(result.knownActions).toBe(0);
      expect(result.percentage).toBeNull();
    });
    
    test('excludes unknown from percentage calculation', () => {
      // 37 total: 29 followed, 5 not followed, 3 unknown
      // Should calculate: 29 / (29 + 5) = 29 / 34 = 85.29%
      // NOT: 29 / 37 = 78.38%
      const result = cropWrappedService.calculateAdherence(29, 5, 3);
      
      expect(result.percentage).not.toBeCloseTo(78.38, 2);
      expect(result.percentage).toBeCloseTo(85.29, 2);
    });
  });
  
  describe('calculateSeasonScore', () => {
    test('calculates score with all components available', () => {
      const overview = {
        recommendations: 37,
        followed: 29,
        notFollowed: 5,
        unknown: 3,
      };
      
      const adherence = {
        percentage: 85.29,
        followed: 29,
        notFollowed: 5,
        unknown: 3,
        knownActions: 34,
      };
      
      const disease = {
        available: true,
        totalAlerts: 2,
        events: [
          { farmerAction: 'FOLLOWED' },
          { farmerAction: 'FOLLOWED' },
        ],
      };
      
      const result = cropWrappedService.calculateSeasonScore(overview, adherence, disease);
      
      expect(result.available).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.components).toHaveProperty('recommendationAdherence');
      expect(result.components).toHaveProperty('diseaseResponse');
      expect(result.components).toHaveProperty('actionTracking');
    });
    
    test('handles missing disease data', () => {
      const overview = {
        recommendations: 20,
        followed: 15,
        notFollowed: 3,
        unknown: 2,
      };
      
      const adherence = {
        percentage: 83.33,
        followed: 15,
        notFollowed: 3,
        unknown: 2,
        knownActions: 18,
      };
      
      const disease = {
        available: false,
        totalAlerts: 0,
      };
      
      const result = cropWrappedService.calculateSeasonScore(overview, adherence, disease);
      
      expect(result.available).toBe(true);
      expect(result.components).not.toHaveProperty('diseaseResponse');
    });
    
    test('handles insufficient data', () => {
      const overview = {
        recommendations: 0,
        followed: 0,
        notFollowed: 0,
        unknown: 0,
      };
      
      const adherence = {
        percentage: null,
        followed: 0,
        notFollowed: 0,
        unknown: 0,
        knownActions: 0,
      };
      
      const disease = {
        available: false,
        totalAlerts: 0,
      };
      
      const result = cropWrappedService.calculateSeasonScore(overview, adherence, disease);
      
      expect(result.available).toBe(false);
    });
  });
});
