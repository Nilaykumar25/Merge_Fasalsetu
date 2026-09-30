/**
 * Demo Data Service
 * 
 * This service provides mock/demo data for the demo account (demo@123).
 * Real users should NEVER see this data.
 */

import * as mockData from '../mocks/data.js';
import type { Farmer } from '../lib/supabase';

export const DEMO_EMAIL = 'demo@123';
export const DEMO_PASSWORD = '123';

/**
 * Check if a user is the demo account
 */
export function isDemoAccount(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_EMAIL.toLowerCase();
}

/**
 * Get demo farmer profile
 */
export function getDemoFarmer(authUserId: string): Farmer {
  return {
    id: 'demo-farmer-001',
    auth_user_id: authUserId,
    name: mockData.farmer.name,
    phone: mockData.farmer.phone,
    state: mockData.farmer.state,
    district: mockData.farmer.district,
    land_area_ac: mockData.farmer.totalArea,
    // legacy aliases kept for UI components
    village: mockData.farmer.village,
    total_area_acres: mockData.farmer.totalArea,
    preferred_language: mockData.farmer.language,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get all mock data for demo account
 */
export function getDemoData() {
  return {
    farmer: mockData.farmer,
    crops: mockData.crops,
    recommendations: mockData.recommendations,
    alerts: mockData.alerts,
    schemes: mockData.schemes,
    gradingHistory: mockData.gradingHistory,
    seasonData: mockData.seasonData,
    timeline: mockData.timeline,
    recentActivity: mockData.recentActivity,
  };
}
