import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export type Database = any;

// ── Real Supabase schema types (mapped from actual DB) ─────────────────────

/**
 * farmers table
 * id, name, phone, state, district, land_area_ac, auth_user_id, created_at, updated_at
 */
export interface Farmer {
  id: string;
  auth_user_id?: string;
  name: string;
  phone?: string;
  state?: string;
  district?: string;
  land_area_ac?: number;
  created_at: string;
  updated_at?: string;
  // Aliases used in legacy code — mapped on load
  village?: string;
  total_area_acres?: number;
  preferred_language?: string;
}

/**
 * crops table
 * id, farmer_id, crop_type, variety, sow_date, expected_harvest_date,
 * area_ac, status, crop_state, season_name, completed_at, created_at
 */
export interface Crop {
  id: string;
  farmer_id: string;
  crop_type: string;
  variety?: string;
  sow_date: string;
  expected_harvest_date?: string;
  area_ac?: number;
  status: string;            // 'active' | 'harvested' | 'failed'
  crop_state: string;        // 'active' | 'harvested' | 'failed' | 'archived'
  season_name?: string;
  completed_at?: string;
  created_at: string;
  // Aliases for legacy UI code
  crop_name?: string;        // alias → crop_type
  planted_date?: string;     // alias → sow_date
  health_status?: string;    // virtual
  current_stage?: string;    // virtual
}

/**
 * crop_state_snapshots table
 * id, crop_id, score, soil_moisture_pct, leaf_color_score,
 * pest_pressure_score, growth_stage_pct, data_quality, computed_at
 */
export interface CropStateSnapshot {
  id: string;
  crop_id: string;
  score?: number;
  soil_moisture_pct?: number;
  leaf_color_score?: number;
  pest_pressure_score?: number;
  growth_stage_pct?: number;
  data_quality?: string;
  computed_at: string;
}

/**
 * CropHealthDaily is now an alias for CropStateSnapshot
 * mapped so existing UI code continues to work
 */
export interface CropHealthDaily {
  id: string;
  crop_id: string;
  date: string;                // mapped from computed_at
  health_score?: number;       // mapped from score
  moisture_pct?: number;       // mapped from soil_moisture_pct
  disease_risk_pct?: number;   // not in real schema — always undefined
  nitrogen_level?: number;     // not in real schema — always undefined
  canopy_cover_pct?: number;   // mapped from growth_stage_pct (proxy)
  organic_carbon?: number;
  soil_ph?: number;
  soil_ec?: number;
  canopy_temperature?: number;
  created_at: string;
}

/**
 * recommendation_events table
 */
export interface Recommendation {
  id: string;
  crop_id: string;
  farmer_id?: string;
  type: string;
  priority: string;
  title: string;
  body?: string;
  why_now?: string;
  predicted_revenue_impact?: number;
  revenue_impact_pct?: number;
  actions?: any[];
  frequency?: string;
  deadline_date?: string;
  status: string;
  action_taken?: string;
  action_notes?: string;
  acknowledged_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * grading_events table
 */
export interface ProduceGrade {
  id: string;
  crop_id: string;
  grade: string;
  score?: number;
  image_url?: string;
  breakdown?: any;
  estimated_market_price?: number;
  currency?: string;
  unit?: string;
  notes?: string;
  graded_at: string;
  // Aliases
  quality_score?: number;
  graded_date?: string;
}

/**
 * sensor_readings table (new)
 */
export interface SensorReading {
  id: string;
  crop_id: string;
  farmer_id: string;
  sensor_id?: string | null;
  reading_type: string;
  value: number;
  unit?: string | null;
  optimal_range?: string | null;
  source: string;              // 'sensor' | 'manual'
  recorded_at: string;
  created_at: string;
  // Legacy alias
  status?: string | null;
}

/**
 * schemes table
 */
export interface GovernmentScheme {
  id: string;
  name: string;
  provider?: string;
  type?: string;
  benefit?: string;
  eligibility?: any;
  states_eligible?: string[];
  crops_eligible?: string[];
  apply_url?: string;
  deadline?: string;
  is_active?: boolean;
  created_at?: string;
}

/**
 * irrigation_logs table
 */
export interface IrrigationLog {
  id: string;
  crop_id: string;
  date: string;
  amount_mm?: number;
  method?: string;
  logged_at: string;
}

/**
 * farmer_actions table
 */
export interface FarmerAction {
  id: string;
  recommendation_id: string;
  farmer_id: string;
  crop_id: string;
  followed: string;
  action_detail?: string;
  source?: string;
  created_at: string;
}

/**
 * advisor_conversations table
 */
export interface AdvisorConversation {
  id: string;
  farmer_id: string;
  query: string;
  response: string;
  created_at: string;
}

// ── Legacy type aliases (keep old imports working) ─────────────────────────
export type Alert = {
  id: string;
  crop_id?: string;
  farmer_id: string;
  alert_type?: string;
  severity: string;
  title: string;
  description?: string;
  status: string;
  is_read?: boolean;
  created_at: string;
  resolved_at?: string;
};

export type Plot = {
  id: string;
  farmer_id: string;
  name: string;
  area_acres?: number;
  created_at: string;
  updated_at?: string;
};

export type Season = {
  id: string;
  farmer_id: string;
  season_name: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  total_revenue_added: number;
  recommendations_followed: number;
  recommendations_skipped: number;
  recommendations_partial: number;
  schemes_applied: number;
  created_at: string;
};

export type SeasonReview = {
  id: string;
  season_id: string;
  review_type: string;
  title: string;
  body?: string;
  created_at: string;
};

export type Message = {
  id: string;
  farmer_id: string;
  message_type: string;
  title: string;
  body?: string;
  channel: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
};

export type FarmerSchemeApplication = {
  id: string;
  farmer_id: string;
  scheme_id: string;
  application_status: string;
  created_at: string;
  updated_at: string;
};

export type UserSettings = {
  id: string;
  farmer_id: string;
  preferred_language: string;
  notification_enabled: boolean;
  notification_channel: string;
  daily_digest_enabled: boolean;
  theme: string;
  created_at: string;
  updated_at: string;
};
