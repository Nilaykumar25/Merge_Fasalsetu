import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface FarmerAlert {
  id: string;
  farmer_id: string;
  crop_id: string | null;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

// ── Demo alerts for demo@123 ──────────────────────────────────────────────────
const DEMO_ALERTS: FarmerAlert[] = [
  {
    id: 'demo-alert-001',
    farmer_id: 'demo-farmer-001',
    crop_id: 'crop-wheat-001',
    type: 'npk_nitrogen',
    severity: 'high',
    title: 'Low Nitrogen (N) in Wheat',
    message:
      'Nitrogen level is 58.0 kg/acre — below the recommended 100–120 kg/acre. ' +
      'Apply Urea or Ammonium Sulfate to prevent yield loss.',
    data: { nutrient: 'Nitrogen (N)', currentValue: 58, healthyRange: '100–120 kg/acre', pctBelow: 42 },
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
  },
  {
    id: 'demo-alert-002',
    farmer_id: 'demo-farmer-001',
    crop_id: 'crop-wheat-001',
    type: 'irrigation',
    severity: 'medium',
    title: 'Irrigation required for Wheat',
    message:
      'Water deficit of 18.5 mm detected. Apply 19 mm of water. ' +
      'Current soil moisture: 48%. Forecast rain: 2.0 mm (insufficient).',
    data: { deficitMm: 18.5, suggestedAmountMm: 19, currentMoisturePct: 48, forecastRainfallMm: 2 },
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
  },
  {
    id: 'demo-alert-003',
    farmer_id: 'demo-farmer-001',
    crop_id: 'crop-cotton-001',
    type: 'npk_potassium',
    severity: 'low',
    title: 'Low Potassium (K) in Cotton',
    message:
      'Potassium level is 19.0 kg/acre — slightly below the recommended 30–40 kg/acre. ' +
      'Apply Muriate of Potash (MOP) to improve disease resistance.',
    data: { nutrient: 'Potassium (K)', currentValue: 19, healthyRange: '30–40 kg/acre', pctBelow: 12 },
    is_read: true,
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
  },
  {
    id: 'demo-alert-004',
    farmer_id: 'demo-farmer-001',
    crop_id: 'crop-wheat-001',
    type: 'npk_phosphorus',
    severity: 'medium',
    title: 'Low Phosphorus (P) in Wheat',
    message:
      'Phosphorus level is 22.0 kg/acre — below the recommended 40–60 kg/acre. ' +
      'Apply DAP or Single Super Phosphate to support root development.',
    data: { nutrient: 'Phosphorus (P)', currentValue: 22, healthyRange: '40–60 kg/acre', pctBelow: 24 },
    is_read: false,
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    expires_at: null,
  },
];

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function fetchAlertsFromSupabase(farmerId: string): Promise<FarmerAlert[]> {
  const { data, error } = await supabase
    .from('farmer_alerts')
    .select('*')
    .eq('farmer_id', farmerId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as FarmerAlert[];
}

async function markOneReadInSupabase(alertId: string): Promise<void> {
  await supabase
    .from('farmer_alerts')
    .update({ is_read: true })
    .eq('id', alertId);
}

async function markAllReadInSupabase(farmerId: string): Promise<void> {
  await supabase
    .from('farmer_alerts')
    .update({ is_read: true })
    .eq('farmer_id', farmerId)
    .eq('is_read', false);
}

// ── Context definition ────────────────────────────────────────────────────────

interface AlertsContextType {
  alerts: FarmerAlert[];
  unreadCount: number;
  loading: boolean;
  toasts: FarmerAlert[];
  dismissToast: (id: string) => void;
  markRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 60_000; // 60 s

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { farmer, isAuthenticated } = useAuth();
  const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';

  const [alerts, setAlerts] = useState<FarmerAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<FarmerAlert[]>([]);
  const toastedIds = useRef<Set<string>>(new Set());

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !farmer) return;

    if (isDemoAccount) {
      setAlerts(DEMO_ALERTS);
      return;
    }

    try {
      const data = await fetchAlertsFromSupabase(farmer.id);
      setAlerts(data);

      // Show toasts for new high-severity unread alerts
      const newHigh = data.filter(
        a => !a.is_read && a.severity === 'high' && !toastedIds.current.has(a.id)
      );
      if (newHigh.length > 0) {
        newHigh.forEach(a => toastedIds.current.add(a.id));
        setToasts(prev => [...prev, ...newHigh]);
      }
    } catch (err) {
      // Fail silently — alerts are non-critical
      console.error('[AlertsContext] Supabase fetch failed:', err);
    }
  }, [isAuthenticated, farmer?.id, isDemoAccount]);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated || !farmer) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [isAuthenticated, farmer?.id]);

  // Poll every minute (real users only)
  useEffect(() => {
    if (!isAuthenticated || !farmer || isDemoAccount) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, farmer?.id, isDemoAccount, refresh]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));

    if (!isDemoAccount) {
      try { await markOneReadInSupabase(id); } catch (err) {
        console.error('[AlertsContext] markRead failed:', err);
        // Revert on failure
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: false } : a));
      }
    }
  }, [isDemoAccount]);

  const markAllAsRead = useCallback(async () => {
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));

    if (!isDemoAccount && farmer) {
      try { await markAllReadInSupabase(farmer.id); } catch (err) {
        console.error('[AlertsContext] markAllAsRead failed:', err);
        refresh(); // Re-sync on failure
      }
    }
  }, [isDemoAccount, farmer?.id, refresh]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AlertsContext.Provider value={{
      alerts,
      unreadCount,
      loading,
      toasts,
      dismissToast,
      markRead,
      markAllAsRead,
      refresh,
    }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider');
  return ctx;
}
