/**
 * api/alerts.ts
 * Frontend API client for the farmer alerts system.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface FarmerAlert {
  id: string;
  farmer_id: string;
  crop_id: string | null;
  type: 'npk_nitrogen' | 'npk_phosphorus' | 'npk_potassium' | 'irrigation' | 'pest' | 'disease' | 'storm' | 'general';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface AlertsResponse {
  alerts: FarmerAlert[];
  total: number;
  unreadCount: number;
}

function getHeaders(): Record<string, string> {
  const farmerId = localStorage.getItem('farmer_id');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (farmerId) headers['X-Farmer-ID'] = farmerId;
  return headers;
}

/** Fetch all alerts for the current farmer */
export async function getAlerts(opts?: {
  unreadOnly?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<AlertsResponse> {
  const params = new URLSearchParams();
  if (opts?.unreadOnly) params.set('unread', 'true');
  if (opts?.type)       params.set('type',   opts.type);
  if (opts?.limit)      params.set('limit',  String(opts.limit));
  if (opts?.offset)     params.set('offset', String(opts.offset));

  const res = await fetch(`${API_BASE}/alerts?${params}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Alerts fetch failed: ${res.status}`);
  return res.json();
}

/** Get just the unread count (lightweight polling call) */
export async function getUnreadCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/alerts/unread-count`, { headers: getHeaders() });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.unreadCount ?? 0;
}

/** Mark a single alert as read */
export async function markAlertRead(alertId: string): Promise<FarmerAlert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/read`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Mark read failed: ${res.status}`);
  const data = await res.json();
  return data.alert;
}

/** Mark all alerts as read */
export async function markAllRead(): Promise<void> {
  const res = await fetch(`${API_BASE}/alerts/read-all`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Mark all read failed: ${res.status}`);
}

/** Trigger manual evaluation (used for testing / dev) */
export async function triggerEvaluation(): Promise<{ alertsCreated: number }> {
  const farmerId = localStorage.getItem('farmer_id');
  const res = await fetch(`${API_BASE}/alerts/evaluate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ farmer_id: farmerId }),
  });
  if (!res.ok) throw new Error(`Evaluation failed: ${res.status}`);
  return res.json();
}
