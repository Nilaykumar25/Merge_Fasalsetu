import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as supabaseService from '../services/supabaseService';
import { getDemoData } from '../services/demoDataService';
import { supabase } from '../lib/supabase';
import type {
  Crop,
  CropHealthDaily,
  Recommendation,
  Alert,
  Plot,
  Season,
  Message,
  SensorReading,
} from '../lib/supabase';

interface DataContextType {
  // Data
  plots: Plot[];
  crops: Crop[];
  currentCrop: Crop | null;
  cropHealth: CropHealthDaily | null;
  cropHealthHistory: CropHealthDaily[];
  recommendations: Recommendation[];
  topRecommendations: Recommendation[];
  alerts: Alert[];
  activeAlerts: Alert[];
  activeSeason: Season | null;
  unreadMessages: Message[];

  // Sensor data
  latestSensorReadings: SensorReading[];
  sensorLastTimestamp: string | null;
  sensorLoading: boolean;

  // State
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentCrop: (crop: Crop | null) => void;
  refreshCropHealth: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshAll: () => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  refreshSensorReadings: () => Promise<void>;
  // Called by modal after a successful manual save to update moisture display
  onSensorReadingSaved: (moistureValue: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Demo sensor readings — shown for the demo account
const DEMO_SENSOR_READINGS: SensorReading[] = [
  {
    id: 'demo-s1', crop_id: 'crop-tomato-001', farmer_id: 'demo-farmer-001',
    sensor_id: 'ESP8266-DEMO', reading_type: 'soil_moisture_pct', value: 74,
    unit: '%', optimal_range: '65–80', source: 'sensor', status: 'sensor',
    recorded_at: new Date(Date.now() - 8000).toISOString(),
    created_at: new Date(Date.now() - 8000).toISOString(),
  },
  {
    id: 'demo-s2', crop_id: 'crop-tomato-001', farmer_id: 'demo-farmer-001',
    sensor_id: 'ESP8266-DEMO', reading_type: 'soil_temperature_c', value: 26,
    unit: '°C', optimal_range: '20–30', source: 'sensor', status: 'sensor',
    recorded_at: new Date(Date.now() - 8000).toISOString(),
    created_at: new Date(Date.now() - 8000).toISOString(),
  },
  {
    id: 'demo-s3', crop_id: 'crop-tomato-001', farmer_id: 'demo-farmer-001',
    sensor_id: 'ESP8266-DEMO', reading_type: 'soil_ph', value: 6.5,
    unit: 'pH', optimal_range: '6.0–7.5', source: 'sensor', status: 'sensor',
    recorded_at: new Date(Date.now() - 8000).toISOString(),
    created_at: new Date(Date.now() - 8000).toISOString(),
  },
  {
    id: 'demo-s4', crop_id: 'crop-tomato-001', farmer_id: 'demo-farmer-001',
    sensor_id: 'ESP8266-DEMO', reading_type: 'nitrogen_kgac', value: 58,
    unit: 'kg/acre', optimal_range: '80–120', source: 'sensor', status: 'sensor',
    recorded_at: new Date(Date.now() - 8000).toISOString(),
    created_at: new Date(Date.now() - 8000).toISOString(),
  },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { farmer, isAuthenticated } = useAuth();

  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [currentCrop, setCurrentCrop] = useState<Crop | null>(null);
  const [cropHealth, setCropHealth] = useState<CropHealthDaily | null>(null);
  const [cropHealthHistory, setCropHealthHistory] = useState<CropHealthDaily[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [topRecommendations, setTopRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);

  // Sensor state
  const [latestSensorReadings, setLatestSensorReadings] = useState<SensorReading[]>([]);
  const [sensorLastTimestamp, setSensorLastTimestamp] = useState<string | null>(null);
  const [sensorLoading, setSensorLoading] = useState(false);
  // Track the latest moisture override from a manual save (dashboard card update)
  const [manualMoistureOverride, setManualMoistureOverride] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep realtime subscription ref so we can clean it up
  const sensorChannelRef = useRef<any>(null);

  // ── Sensor reads ───────────────────────────────────────────────────────────

  const refreshSensorReadings = useCallback(async () => {
    const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';
    if (isDemoAccount) {
      setLatestSensorReadings(DEMO_SENSOR_READINGS);
      setSensorLastTimestamp(DEMO_SENSOR_READINGS[0].recorded_at);
      return;
    }
    if (!currentCrop?.id) return;

    setSensorLoading(true);
    try {
      const rows = await supabaseService.getLatestSensorReadings(currentCrop.id);
      setLatestSensorReadings(rows);
      if (rows.length > 0) {
        const sorted = [...rows].sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
        setSensorLastTimestamp(sorted[0].recorded_at);
      } else {
        setSensorLastTimestamp(null);
      }
    } catch (err) {
      console.warn('[DataContext] sensor_readings fetch failed:', err);
    } finally {
      setSensorLoading(false);
    }
  }, [currentCrop?.id]);

  // ── Supabase Realtime subscription for sensor_readings ────────────────────

  useEffect(() => {
    const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';
    if (isDemoAccount || !currentCrop?.id) return;

    // Clean up previous subscription
    if (sensorChannelRef.current) {
      supabase.removeChannel(sensorChannelRef.current);
      sensorChannelRef.current = null;
    }

    const cropId = currentCrop.id;
    const channel = supabase
      .channel(`sensor_readings:${cropId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `crop_id=eq.${cropId}`,
        },
        (payload) => {
          const newRow = payload.new as SensorReading;
          setLatestSensorReadings((prev) => {
            // Replace existing reading of same type with newer one
            const filtered = prev.filter((r) => r.reading_type !== newRow.reading_type);
            return [newRow, ...filtered];
          });
          setSensorLastTimestamp(newRow.recorded_at);
          // If moisture arrived, clear any manual override so live data takes priority
          if (newRow.reading_type === 'soil_moisture_pct') {
            setManualMoistureOverride(null);
          }
        }
      )
      .subscribe();

    sensorChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      sensorChannelRef.current = null;
    };
  }, [currentCrop?.id]);

  // ── Load sensor data when crop changes ────────────────────────────────────

  useEffect(() => {
    refreshSensorReadings();
  }, [currentCrop?.id, refreshSensorReadings]);

  // ── Called by modal after manual save ─────────────────────────────────────

  const onSensorReadingSaved = useCallback((moistureValue: number) => {
    setManualMoistureOverride(moistureValue);
    // Also refresh the full sensor list
    refreshSensorReadings();
  }, [refreshSensorReadings]);

  // ── Existing data loading ─────────────────────────────────────────────────

  useEffect(() => {
    if (isAuthenticated && farmer) {
      refreshAll();
    }
  }, [isAuthenticated, farmer?.id]);

  useEffect(() => {
    if (currentCrop) {
      refreshCropHealth();
    }
  }, [currentCrop?.id]);

  const refreshCropHealth = useCallback(async () => {
    if (!currentCrop) return;
    const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';
    if (isDemoAccount) return;

    try {
      const [health, history] = await Promise.all([
        supabaseService.getCropHealthToday(currentCrop.id),
        supabaseService.getCropHealthHistory(currentCrop.id, 7),
      ]);
      setCropHealth(health);
      setCropHealthHistory(history);
    } catch (err: any) {
      if (err?.code === '404' || err?.status === 404 || err?.message?.includes('404')) {
        console.warn('[DataContext] crop_health_daily table not found — skipping');
        return;
      }
      console.error('Error loading crop health:', err);
    }
  }, [currentCrop]);

  const refreshRecommendations = useCallback(async () => {
    if (!farmer) return;
    try {
      const [all, top] = await Promise.all([
        supabaseService.getRecommendations(farmer.id),
        supabaseService.getTopRecommendations(farmer.id, 3),
      ]);
      setRecommendations(all);
      setTopRecommendations(top);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  }, [farmer]);

  const refreshAlerts = useCallback(async () => {
    if (!farmer) return;
    try {
      const [all, active] = await Promise.all([
        supabaseService.getAlerts(farmer.id),
        supabaseService.getActiveAlerts(farmer.id),
      ]);
      setAlerts(all);
      setActiveAlerts(active);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  }, [farmer]);

  const refreshMessages = useCallback(async () => {
    if (!farmer) return;
    try {
      const messages = await supabaseService.getUnreadMessages(farmer.id);
      setUnreadMessages(messages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }, [farmer]);

  const refreshAll = useCallback(async () => {
    if (!farmer) return;
    setLoading(true);
    setError(null);
    try {
      const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';
      if (isDemoAccount) {
        const demoData = getDemoData();
        setPlots([]);
        setCrops(demoData.crops as any);
        setActiveSeason(null);
        if (demoData.crops.length > 0 && !currentCrop) {
          setCurrentCrop(demoData.crops[0] as any);
        }
        setRecommendations(demoData.recommendations as any);
        setTopRecommendations(demoData.recommendations.slice(0, 3) as any);
        setAlerts(demoData.alerts as any);
        setActiveAlerts(demoData.alerts as any);
        setUnreadMessages([]);
        // Load demo sensor readings
        setLatestSensorReadings(DEMO_SENSOR_READINGS);
        setSensorLastTimestamp(DEMO_SENSOR_READINGS[0].recorded_at);
        setLoading(false);
        return;
      }

      const [plotsData, cropsData, season] = await Promise.all([
        supabaseService.getPlots(farmer.id).catch(() => []),
        supabaseService.getCrops(farmer.id).catch(() => []),
        supabaseService.getActiveSeason(farmer.id).catch(() => null),
      ]);

      setPlots(plotsData);
      setCrops(cropsData);
      setActiveSeason(season);

      if (cropsData.length > 0 && !currentCrop) {
        setCurrentCrop(cropsData[0]);
      }

      Promise.all([
        refreshRecommendations(),
        refreshAlerts(),
        refreshMessages(),
      ]).catch(console.error);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [farmer, currentCrop, refreshRecommendations, refreshAlerts, refreshMessages]);

  const handleMarkMessageAsRead = useCallback(async (messageId: string) => {
    try {
      await supabaseService.markMessageAsRead(messageId);
      setUnreadMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  }, []);

  // ── Derive live soil moisture for dashboard ───────────────────────────────
  // Priority: live sensor > manual override > cropHealth > 0
  const sensorMoisture = latestSensorReadings.find(
    (r) => r.reading_type === 'soil_moisture_pct'
  );

  // Expose a computed soilMoisture that other components can read
  // (we bubble it up via context so Dashboard and modal both agree)

  const value: DataContextType = {
    plots,
    crops,
    currentCrop,
    cropHealth,
    cropHealthHistory,
    recommendations,
    topRecommendations,
    alerts,
    activeAlerts,
    activeSeason,
    unreadMessages,
    latestSensorReadings,
    sensorLastTimestamp,
    sensorLoading,
    loading,
    error,
    setCurrentCrop,
    refreshCropHealth,
    refreshRecommendations,
    refreshAlerts,
    refreshAll,
    markMessageAsRead: handleMarkMessageAsRead,
    refreshSensorReadings,
    onSensorReadingSaved,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
