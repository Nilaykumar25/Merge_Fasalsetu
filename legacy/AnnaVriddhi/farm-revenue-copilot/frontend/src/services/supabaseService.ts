/**
 * supabaseService.ts
 * Data layer mapped to the REAL Supabase schema.
 *
 * Real tables:
 *   farmers, crops, crop_state_snapshots, recommendation_events,
 *   grading_events, irrigation_logs, schemes, farmer_actions,
 *   advisor_conversations, sensor_readings
 *
 * Non-existent tables (gracefully handled):
 *   plots, crop_health_daily, alerts, messages, seasons, user_settings
 */
import { supabase } from '../lib/supabase';
import type {
  Farmer, Crop, CropHealthDaily, CropStateSnapshot,
  Recommendation, ProduceGrade, Alert, SensorReading,
  Season, SeasonReview, Message, GovernmentScheme,
  FarmerSchemeApplication, Plot,
} from '../lib/supabase';

// ── Helper: map CropStateSnapshot → CropHealthDaily shape ────────────────────
function snapshotToHealth(snap: CropStateSnapshot): CropHealthDaily {
  return {
    id: snap.id,
    crop_id: snap.crop_id,
    date: snap.computed_at?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    health_score: snap.score,
    moisture_pct: snap.soil_moisture_pct,
    disease_risk_pct: undefined,
    nitrogen_level: undefined,
    canopy_cover_pct: snap.growth_stage_pct,
    created_at: snap.computed_at ?? new Date().toISOString(),
  };
}

// ── Helper: map Crop DB row → Crop interface (add aliases) ───────────────────
function mapCrop(row: any): Crop {
  return {
    ...row,
    crop_name: row.crop_type,       // alias
    planted_date: row.sow_date,     // alias
    health_status: row.status,      // alias
  };
}

// ============================================================================
// FARMERS
// ============================================================================

export async function getFarmerByAuthId(authUserId: string): Promise<Farmer | null> {
  const { data, error } = await supabase
    .from('farmers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createFarmer(farmer: Partial<Farmer>): Promise<Farmer> {
  const { data, error } = await supabase
    .from('farmers')
    .insert({
      auth_user_id: farmer.auth_user_id,
      name: farmer.name,
      phone: farmer.phone,
      state: farmer.state,
      district: farmer.district,
      land_area_ac: farmer.total_area_acres ?? farmer.land_area_ac,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// PLOTS (virtual — not in real schema, return empty arrays gracefully)
// ============================================================================

export async function getPlots(_farmerId: string): Promise<Plot[]> {
  return [];
}

// ============================================================================
// CROPS
// ============================================================================

export async function getCrops(farmerId: string): Promise<Crop[]> {
  const { data, error } = await supabase
    .from('crops')
    .select('*')
    .eq('farmer_id', farmerId)
    .eq('crop_state', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCrop);
}

export async function getCropsByPlot(_plotId: string): Promise<Crop[]> {
  return [];
}

export async function getCropWithHealth(cropId: string): Promise<(Crop & { health?: CropHealthDaily | null }) | null> {
  const { data: crop, error } = await supabase
    .from('crops').select('*').eq('id', cropId).single();
  if (error) throw error;

  const { data: snap } = await supabase
    .from('crop_state_snapshots')
    .select('*').eq('crop_id', cropId)
    .order('computed_at', { ascending: false }).limit(1).maybeSingle();

  return { ...mapCrop(crop), health: snap ? snapshotToHealth(snap) : null };
}

export async function createCrop(crop: Partial<Crop>): Promise<Crop> {
  const { data, error } = await supabase
    .from('crops')
    .insert({
      farmer_id: crop.farmer_id,
      crop_type: crop.crop_type ?? crop.crop_name,
      variety: crop.variety,
      sow_date: crop.sow_date ?? crop.planted_date,
      expected_harvest_date: crop.expected_harvest_date,
      area_ac: crop.area_ac,
      status: crop.status ?? 'active',
      crop_state: crop.crop_state ?? 'active',
      season_name: crop.season_name,
    })
    .select().single();
  if (error) throw error;
  return mapCrop(data);
}

export async function updateCrop(cropId: string, updates: Partial<Crop>): Promise<Crop> {
  const { data, error } = await supabase
    .from('crops').update(updates).eq('id', cropId).select().single();
  if (error) throw error;
  return mapCrop(data);
}

// ============================================================================
// CROP HEALTH (mapped from crop_state_snapshots)
// ============================================================================

export async function getCropHealthToday(cropId: string): Promise<CropHealthDaily | null> {
  const { data, error } = await supabase
    .from('crop_state_snapshots')
    .select('*')
    .eq('crop_id', cropId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? snapshotToHealth(data) : null;
}

export async function getCropHealthHistory(cropId: string, days: number = 7): Promise<CropHealthDaily[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('crop_state_snapshots')
    .select('*')
    .eq('crop_id', cropId)
    .gte('computed_at', since)
    .order('computed_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(snapshotToHealth);
}

export async function createCropHealthDaily(health: Partial<CropHealthDaily>): Promise<CropHealthDaily> {
  // Insert into crop_state_snapshots
  const { data, error } = await supabase
    .from('crop_state_snapshots')
    .insert({
      crop_id: health.crop_id,
      score: health.health_score,
      soil_moisture_pct: health.moisture_pct,
      growth_stage_pct: health.canopy_cover_pct,
    })
    .select().single();
  if (error) throw error;
  return snapshotToHealth(data);
}

// ============================================================================
// RECOMMENDATIONS (recommendation_events)
// ============================================================================

export async function getRecommendations(farmerId: string): Promise<Recommendation[]> {
  // Join via crops to filter by farmer
  const { data: crops } = await supabase
    .from('crops').select('id').eq('farmer_id', farmerId);
  if (!crops?.length) return [];

  const cropIds = crops.map(c => c.id);
  const { data, error } = await supabase
    .from('recommendation_events')
    .select('*')
    .in('crop_id', cropIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({ ...r, farmer_id: farmerId }));
}

export async function getRecommendationsByCrop(cropId: string): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from('recommendation_events')
    .select('*').eq('crop_id', cropId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getTopRecommendations(farmerId: string, limit: number = 3): Promise<Recommendation[]> {
  const { data: crops } = await supabase
    .from('crops').select('id').eq('farmer_id', farmerId);
  if (!crops?.length) return [];

  const cropIds = crops.map(c => c.id);
  const { data, error } = await supabase
    .from('recommendation_events')
    .select('*')
    .in('crop_id', cropIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(r => ({ ...r, farmer_id: farmerId }));
}

export async function createRecommendation(rec: Partial<Recommendation>): Promise<Recommendation> {
  const { data, error } = await supabase
    .from('recommendation_events')
    .insert({
      crop_id: rec.crop_id,
      type: rec.type,
      priority: rec.priority,
      title: rec.title,
      body: rec.body,
      predicted_revenue_impact: rec.predicted_revenue_impact,
      status: rec.status ?? 'pending',
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateRecommendation(recId: string, updates: Partial<Recommendation>): Promise<Recommendation> {
  const { data, error } = await supabase
    .from('recommendation_events')
    .update(updates).eq('id', recId).select().single();
  if (error) throw error;
  return data;
}

// ============================================================================
// ALERTS (no real alerts table — return empty gracefully)
// ============================================================================

export async function getAlerts(_farmerId: string): Promise<Alert[]> {
  return [];
}
export async function getActiveAlerts(_farmerId: string): Promise<Alert[]> {
  return [];
}
export async function createAlert(_alert: Partial<Alert>): Promise<Alert> {
  throw new Error('alerts table not in current schema');
}
export async function updateAlert(_alertId: string, _updates: Partial<Alert>): Promise<Alert> {
  throw new Error('alerts table not in current schema');
}

// ============================================================================
// PRODUCE GRADES (grading_events)
// ============================================================================

export async function getProduceGrades(_farmerId: string): Promise<ProduceGrade[]> {
  const { data, error } = await supabase
    .from('grading_events')
    .select('*')
    .order('graded_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(g => ({ ...g, graded_date: g.graded_at, quality_score: g.score }));
}

export async function getProduceGradesByCrop(cropId: string): Promise<ProduceGrade[]> {
  const { data, error } = await supabase
    .from('grading_events')
    .select('*').eq('crop_id', cropId)
    .order('graded_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(g => ({ ...g, graded_date: g.graded_at, quality_score: g.score }));
}

export async function createProduceGrade(grade: Partial<ProduceGrade>): Promise<ProduceGrade> {
  const { data, error } = await supabase
    .from('grading_events')
    .insert({
      crop_id: grade.crop_id,
      grade: grade.grade,
      score: grade.score ?? grade.quality_score,
      image_url: grade.image_url,
      breakdown: grade.breakdown,
      estimated_market_price: grade.estimated_market_price ?? grade.market_price_per_unit,
      notes: grade.notes,
    })
    .select().single();
  if (error) throw error;
  return { ...data, graded_date: data.graded_at, quality_score: data.score };
}

// ============================================================================
// GOVERNMENT SCHEMES (schemes table)
// ============================================================================

export async function getGovernmentSchemes(): Promise<GovernmentScheme[]> {
  const { data, error } = await supabase
    .from('schemes').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getSchemesByState(state: string): Promise<GovernmentScheme[]> {
  const { data, error } = await supabase
    .from('schemes').select('*')
    .contains('states_eligible', [state]);
  if (error) throw error;
  return data || [];
}

// ============================================================================
// FARMER SCHEME APPLICATIONS (no table — stub)
// ============================================================================

export async function getFarmerSchemeApplications(_farmerId: string): Promise<FarmerSchemeApplication[]> {
  return [];
}
export async function createSchemeApplication(_app: Partial<FarmerSchemeApplication>): Promise<FarmerSchemeApplication> {
  throw new Error('farmer_scheme_applications not in current schema');
}
export async function updateSchemeApplication(_id: string, _updates: Partial<FarmerSchemeApplication>): Promise<FarmerSchemeApplication> {
  throw new Error('farmer_scheme_applications not in current schema');
}

// ============================================================================
// SEASONS (not a real table — derive from crops.season_name)
// ============================================================================

export async function getSeasons(_farmerId: string): Promise<Season[]> {
  return [];
}
export async function getActiveSeason(_farmerId: string): Promise<Season | null> {
  return null;
}
export async function createSeason(_season: Partial<Season>): Promise<Season> {
  throw new Error('seasons table not in current schema');
}
export async function updateSeason(_id: string, _updates: Partial<Season>): Promise<Season> {
  throw new Error('seasons table not in current schema');
}

// ============================================================================
// SEASON REVIEWS (stub)
// ============================================================================

export async function getSeasonReviews(_seasonId: string): Promise<SeasonReview[]> {
  return [];
}
export async function createSeasonReview(_review: Partial<SeasonReview>): Promise<SeasonReview> {
  throw new Error('season_reviews table not in current schema');
}

// ============================================================================
// MESSAGES (no table — stub)
// ============================================================================

export async function getMessages(_farmerId: string): Promise<Message[]> {
  return [];
}
export async function getUnreadMessages(_farmerId: string): Promise<Message[]> {
  return [];
}
export async function createMessage(_msg: Partial<Message>): Promise<Message> {
  throw new Error('messages table not in current schema');
}
export async function markMessageAsRead(_messageId: string): Promise<Message> {
  throw new Error('messages table not in current schema');
}

// ============================================================================
// SENSOR READINGS (sensor_readings — new table)
// ============================================================================

export interface SensorReadingRow {
  id: string;
  crop_id: string;
  farmer_id: string;
  sensor_id: string | null;
  reading_type: string;
  value: number;
  unit: string | null;
  optimal_range: string | null;
  source: string;
  recorded_at: string;
  created_at: string;
}

export async function getLatestSensorReadings(cropId: string): Promise<SensorReadingRow[]> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('crop_id', cropId)
    .order('recorded_at', { ascending: false })
    .limit(20);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
    console.warn('[supabaseService] sensor_readings query failed:', error.message);
    return [];
  }

  // Deduplicate — keep latest per reading_type
  const seen = new Set<string>();
  return (data || []).filter(row => {
    if (seen.has(row.reading_type)) return false;
    seen.add(row.reading_type);
    return true;
  });
}

export async function insertSensorReadings(
  rows: Omit<SensorReadingRow, 'id' | 'created_at'>[]
): Promise<SensorReadingRow[]> {
  const { data, error } = await supabase
    .from('sensor_readings').insert(rows).select();
  if (error) throw error;
  return data || [];
}
