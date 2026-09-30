import { useState, useEffect, useCallback, useRef } from 'react';
import { C, radius, shadow } from '../tokens';
import { Btn } from './ui';
import { useData } from '../contexts/DataContext';
import { saveSensorReading } from '../api/sensors';

// ── Connection status thresholds (seconds) ────────────────────────────────────
const THRESHOLDS = {
  LIVE: 30,           // < 30s  → Live
  RECENT: 120,        // 30s–2m → Recently connected
  // beyond RECENT    → Offline
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'live' | 'recent' | 'offline';

interface FormValues {
  moisture: string;
  temperature: string;
  ph: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
}

interface FormErrors {
  moisture?: string;
  temperature?: string;
  ph?: string;
  nitrogen?: string;
  phosphorus?: string;
  potassium?: string;
}

interface Props {
  onClose: () => void;
  onSaved?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSecondsAgo(ts: string | null): number | null {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
}

function getConnectionStatus(secondsAgo: number | null): ConnectionStatus {
  if (secondsAgo === null) return 'offline';
  if (secondsAgo < THRESHOLDS.LIVE) return 'live';
  if (secondsAgo < THRESHOLDS.RECENT) return 'recent';
  return 'offline';
}

function formatSecondsAgo(s: number): string {
  if (s < 60) return `${s} second${s !== 1 ? 's' : ''} ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m !== 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  return `${h} hour${h !== 1 ? 's' : ''} ago`;
}

const STATUS_STYLE: Record<ConnectionStatus, { dot: string; label: string; sub: string }> = {
  live:    { dot: '#22c55e', label: 'Sensor Connected', sub: 'Live readings active' },
  recent:  { dot: C.amber,  label: 'Recently Connected', sub: 'Reading may be slightly stale' },
  offline: { dot: C.rust,   label: 'Sensor Offline', sub: 'No automatic reading available' },
};

const READING_META: Record<string, { label: string; unit: string; icon: string; color: string; bg: string }> = {
  soil_moisture_pct: { label: 'Soil Moisture',  unit: '%',       icon: '≈', color: C.blue,     bg: C.blueTint },
  soil_temperature_c:{ label: 'Temperature',    unit: '°C',      icon: '▲', color: C.amber,    bg: C.amberTint },
  soil_ph:           { label: 'Soil pH',        unit: ' pH',     icon: '⊕', color: C.sageDeep, bg: C.sageTint },
  nitrogen_kgac:     { label: 'Nitrogen (N)',   unit: ' kg/acre',icon: 'N', color: C.sage,     bg: C.sageTint },
  phosphorus_kgac:   { label: 'Phosphorus (P)', unit: ' kg/acre',icon: 'P', color: C.sageMid,  bg: C.sageTint },
  potassium_kgac:    { label: 'Potassium (K)',  unit: ' kg/acre',icon: 'K', color: C.amber,    bg: C.amberTint },
};

// ── Toast helper (inline, no library) ────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: C.sageDeep, color: '#fff', padding: '12px 24px',
      borderRadius: radius.full, fontSize: 13, fontWeight: 600,
      boxShadow: shadow.lg, zIndex: 9999, pointerEvents: 'none',
      animation: 'fadeInUp 0.2s ease',
    }}>
      ✓ {msg}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SoilSensorModal({ onClose, onSaved }: Props) {
  const { latestSensorReadings, sensorLastTimestamp, sensorLoading, currentCrop, onSensorReadingSaved } = useData();
  const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';

  const [mode, setMode] = useState<'view' | 'manual'>('view');
  const [secondsAgo, setSecondsAgo] = useState<number | null>(getSecondsAgo(sensorLastTimestamp));
  const [form, setForm] = useState<FormValues>({ moisture: '', temperature: '', ph: '', nitrogen: '', phosphorus: '', potassium: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update seconds-ago ticker
  useEffect(() => {
    setSecondsAgo(getSecondsAgo(sensorLastTimestamp));
    const id = setInterval(() => {
      setSecondsAgo(getSecondsAgo(sensorLastTimestamp));
    }, 1000);
    return () => clearInterval(id);
  }, [sensorLastTimestamp]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const connStatus = getConnectionStatus(secondsAgo);
  const statusMeta = STATUS_STYLE[connStatus];

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FormErrors = {};
    const moisture = parseFloat(form.moisture);
    if (!form.moisture.trim()) { e.moisture = 'Soil moisture is required'; }
    else if (isNaN(moisture) || moisture < 0 || moisture > 100) { e.moisture = 'Must be 0–100%'; }

    if (form.temperature.trim()) {
      if (isNaN(parseFloat(form.temperature))) e.temperature = 'Must be a number';
    }
    if (form.ph.trim()) {
      const v = parseFloat(form.ph);
      if (isNaN(v) || v < 0 || v > 14) e.ph = 'Must be 0–14';
    }
    if (form.nitrogen.trim() && (isNaN(parseFloat(form.nitrogen)) || parseFloat(form.nitrogen) < 0)) e.nitrogen = 'Must be non-negative';
    if (form.phosphorus.trim() && (isNaN(parseFloat(form.phosphorus)) || parseFloat(form.phosphorus) < 0)) e.phosphorus = 'Must be non-negative';
    if (form.potassium.trim() && (isNaN(parseFloat(form.potassium)) || parseFloat(form.potassium) < 0)) e.potassium = 'Must be non-negative';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    if (!currentCrop?.id && !isDemoAccount) {
      setErrors({ moisture: 'No active crop selected' });
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        source: 'manual',
        soil_moisture_pct: parseFloat(form.moisture),
      };
      if (form.temperature.trim()) payload.soil_temperature_c = parseFloat(form.temperature);
      if (form.ph.trim())          payload.soil_ph           = parseFloat(form.ph);
      if (form.nitrogen.trim())    payload.nitrogen_kgac     = parseFloat(form.nitrogen);
      if (form.phosphorus.trim())  payload.phosphorus_kgac   = parseFloat(form.phosphorus);
      if (form.potassium.trim())   payload.potassium_kgac    = parseFloat(form.potassium);

      if (!isDemoAccount && currentCrop?.id) {
        await saveSensorReading(currentCrop.id, payload);
      }

      onSensorReadingSaved(parseFloat(form.moisture));
      setToast('Soil reading saved successfully.');
      onSaved?.();
      setMode('view');
      setForm({ moisture: '', temperature: '', ph: '', nitrogen: '', phosphorus: '', potassium: '' });
    } catch (err) {
      console.error('Failed to save sensor reading:', err);
      setErrors({ moisture: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [form, validate, currentCrop, isDemoAccount, onSensorReadingSaved, onSaved]);

  // ── Overlay click ────────────────────────────────────────────────────────────

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // ── Field change ─────────────────────────────────────────────────────────────

  const setField = (key: keyof FormValues, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(er => ({ ...er, [key]: undefined }));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(36,38,33,0.35)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Modal panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Soil Sensor"
          style={{
            background: C.surface,
            borderRadius: radius.xxl,
            boxShadow: shadow.lg,
            border: `1px solid ${C.line}`,
            width: '100%',
            maxWidth: 520,
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px 24px 16px',
            borderBottom: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: C.sageDeep }}>
                {mode === 'manual' ? 'Manual Soil Reading' : 'Soil Sensor'}
              </div>
              {mode === 'view' && (
                <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 3 }}>
                  Monitor your soil conditions and manage sensor readings.
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                width: 32, height: 32, borderRadius: radius.full,
                background: C.bg, border: `1px solid ${C.line}`,
                cursor: 'pointer', fontSize: 16, color: C.inkMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >×</button>
          </div>

          <div style={{ padding: '20px 24px 24px' }}>
            {mode === 'view' ? (
              <ViewMode
                connStatus={connStatus}
                statusMeta={statusMeta}
                secondsAgo={secondsAgo}
                readings={latestSensorReadings}
                sensorLoading={sensorLoading}
                onManual={() => setMode('manual')}
              />
            ) : (
              <ManualMode
                form={form}
                errors={errors}
                saving={saving}
                setField={setField}
                onSave={handleSave}
                onCancel={() => { setMode('view'); setErrors({}); setForm({ moisture: '', temperature: '', ph: '', nitrogen: '', phosphorus: '', potassium: '' }); }}
              />
            )}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}

// ── View mode ──────────────────────────────────────────────────────────────────

function ViewMode({
  connStatus, statusMeta, secondsAgo, readings, sensorLoading, onManual,
}: {
  connStatus: ConnectionStatus;
  statusMeta: { dot: string; label: string; sub: string };
  secondsAgo: number | null;
  readings: any[];
  sensorLoading: boolean;
  onManual: () => void;
}) {
  const isOnline = connStatus !== 'offline';

  return (
    <>
      {/* Connection status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: isOnline ? C.sageTint : C.rustTint,
        borderRadius: radius.lg,
        border: `1px solid ${isOnline ? C.sage + '33' : C.rust + '33'}`,
        marginBottom: 20,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: statusMeta.dot,
          boxShadow: isOnline ? `0 0 0 3px ${statusMeta.dot}33` : 'none',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{statusMeta.label}</div>
          <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>
            {isOnline && secondsAgo !== null
              ? `ESP8266 · Last reading ${formatSecondsAgo(secondsAgo)}`
              : statusMeta.sub
            }
          </div>
        </div>
      </div>

      {/* Sensor reading cards */}
      {sensorLoading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: C.inkMuted, fontSize: 13 }}>
          Loading sensor data…
        </div>
      ) : readings.length > 0 ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}>
            {readings.map((r) => {
              const meta = READING_META[r.reading_type] ?? {
                label: r.reading_type, unit: r.unit ?? '', icon: '◈', color: C.ink, bg: C.bg,
              };
              const isLive = r.source === 'sensor' || r.status === 'sensor';
              return (
                <div key={r.id} style={{
                  background: meta.bg,
                  border: `1px solid ${meta.color}22`,
                  borderRadius: radius.lg,
                  padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.inkMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                    {meta.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: meta.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {r.value}{meta.unit}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#22c55e' : C.amber, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: C.inkMuted, fontWeight: 500 }}>
                      {isLive ? 'Live sensor' : 'Manual entry'}
                    </span>
                  </div>
                  {r.optimal_range && (
                    <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 4 }}>
                      Optimal: {r.optimal_range}{meta.unit}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {secondsAgo !== null && (
            <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 20 }}>
              Last updated: {formatSecondsAgo(secondsAgo)}
            </div>
          )}
        </>
      ) : !isOnline ? (
        <div style={{
          textAlign: 'center', padding: '28px 0 20px',
          color: C.inkMuted, fontSize: 13, lineHeight: 1.6,
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
          <div style={{ fontWeight: 600, color: C.ink, marginBottom: 4 }}>No sensor data yet</div>
          <div>Connect your ESP8266 or enter a reading manually.</div>
        </div>
      ) : null}

      {/* Manual entry button */}
      <div style={{ marginTop: isOnline && readings.length > 0 ? 0 : 4 }}>
        {!isOnline ? (
          <Btn variant="primary" fullWidth onClick={onManual}>
            Enter Reading Manually
          </Btn>
        ) : (
          <button
            onClick={onManual}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: C.sage, fontWeight: 600,
              padding: '4px 0', display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--font-body)',
            }}
          >
            ✎ Enter manually
          </button>
        )}
      </div>

      {/* Last connection footer */}
      {!isOnline && (
        <div style={{ marginTop: 20, fontSize: 11, color: C.inkMuted }}>
          Last connection: {secondsAgo !== null ? formatSecondsAgo(secondsAgo) : '—'}
        </div>
      )}
    </>
  );
}

// ── Manual entry mode ─────────────────────────────────────────────────────────

function ManualMode({
  form, errors, saving, setField, onSave, onCancel,
}: {
  form: FormValues;
  errors: FormErrors;
  saving: boolean;
  setField: (k: keyof FormValues, v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const fields: Array<{
    key: keyof FormValues; label: string; unit: string;
    placeholder: string; required?: boolean;
  }> = [
    { key: 'moisture',    label: 'Soil Moisture',    unit: '%',       placeholder: 'e.g. 74', required: true },
    { key: 'temperature', label: 'Soil Temperature', unit: '°C',      placeholder: 'e.g. 26' },
    { key: 'ph',          label: 'Soil pH',          unit: '',        placeholder: 'e.g. 6.5' },
    { key: 'nitrogen',    label: 'Nitrogen (N)',      unit: 'kg/acre', placeholder: 'e.g. 58' },
    { key: 'phosphorus',  label: 'Phosphorus (P)',    unit: 'kg/acre', placeholder: 'e.g. 22' },
    { key: 'potassium',   label: 'Potassium (K)',     unit: 'kg/acre', placeholder: 'e.g. 180' },
  ];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        {fields.map(({ key, label, unit, placeholder, required }) => (
          <div key={key}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 6,
            }}>
              <label htmlFor={`sensor-${key}`} style={{
                fontSize: 12, fontWeight: 600, color: C.ink,
              }}>
                {label}
                {required && <span style={{ color: C.rust, marginLeft: 2 }}>*</span>}
              </label>
              {unit && (
                <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 500 }}>
                  {unit}
                </span>
              )}
            </div>
            <input
              id={`sensor-${key}`}
              type="number"
              step="any"
              value={form[key]}
              onChange={e => setField(key, e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1.5px solid ${errors[key] ? C.rust : C.line}`,
                borderRadius: radius.md,
                fontSize: 14,
                color: C.ink,
                background: C.surface,
                outline: 'none',
                fontFamily: 'var(--font-body)',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = C.sage)}
              onBlur={e => (e.target.style.borderColor = errors[key] ? C.rust : C.line)}
            />
            {errors[key] && (
              <div style={{ fontSize: 11, color: C.rust, marginTop: 4 }}>
                {errors[key]}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Btn variant="secondary" fullWidth onClick={onCancel} disabled={saving}>
          Cancel
        </Btn>
        <Btn variant="primary" fullWidth onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Reading'}
        </Btn>
      </div>
    </>
  );
}

function formatSecondsAgo(s: number): string {
  if (s < 60) return `${s} second${s !== 1 ? 's' : ''} ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m !== 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  return `${h} hour${h !== 1 ? 's' : ''} ago`;
}
