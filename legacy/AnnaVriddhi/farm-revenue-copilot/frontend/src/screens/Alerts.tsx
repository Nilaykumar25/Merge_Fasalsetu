import { useState } from 'react';
import { C, radius, shadow } from '../tokens';
import { PageHeader } from '../components/ui';
import type { Screen } from '../tokens';
import { useAlerts, type FarmerAlert } from '../contexts/AlertsContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(severity: string): string {
  if (severity === 'high')   return C.rust;
  if (severity === 'medium') return C.amber;
  return C.sage;
}

function severityBg(severity: string): string {
  if (severity === 'high')   return C.rustTint;
  if (severity === 'medium') return C.amberTint;
  return C.sageTint;
}

function severityDot(severity: string): string {
  if (severity === 'high')   return '🔴';
  if (severity === 'medium') return '🟠';
  return '🟢';
}

function typeIcon(type: string): string {
  if (type.startsWith('npk')) return '⊕';
  if (type === 'irrigation')  return '≈';
  if (type === 'pest')        return '⚠';
  if (type === 'disease')     return '🦠';
  if (type === 'storm')       return '⛈';
  return '◈';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({ alert, onMarkRead }: { alert: FarmerAlert; onMarkRead: (id: string) => void }) {
  const col = severityColor(alert.severity);
  const bg  = severityBg(alert.severity);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: alert.is_read ? C.surface : bg,
        borderRadius: radius.lg,
        border: `1.5px solid ${alert.is_read ? C.line : col + '44'}`,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        boxShadow: alert.is_read ? 'none' : shadow.card,
        opacity: alert.is_read ? 0.75 : 1,
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.md,
            background: col + '22',
            border: `1px solid ${col}33`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {typeIcon(alert.type)}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 10 }}>{severityDot(alert.severity)}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: col,
              }}
            >
              {alert.severity}
            </span>
            <span style={{ fontSize: 10, color: C.inkMuted, marginLeft: 'auto' }}>
              {relativeTime(alert.created_at)}
            </span>
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: alert.is_read ? 500 : 700,
              color: C.ink,
              marginBottom: 4,
              lineHeight: 1.3,
            }}
          >
            {alert.title}
          </div>

          <div
            style={{
              fontSize: 12,
              color: C.inkMuted,
              lineHeight: 1.55,
              overflow: 'hidden',
              maxHeight: expanded ? 'none' : '2.8em',
            }}
          >
            {alert.message}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && alert.data && Object.keys(alert.data).length > 0 && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${col}22`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
          }}
          onClick={e => e.stopPropagation()}
        >
          {alert.data.currentValue !== undefined && (
            <DataChip label="Current value" value={`${alert.data.currentValue} kg/ac`} color={col} />
          )}
          {alert.data.healthyRange && (
            <DataChip label="Healthy range" value={alert.data.healthyRange} color={C.sage} />
          )}
          {alert.data.deficitMm !== undefined && (
            <DataChip label="Water deficit" value={`${alert.data.deficitMm.toFixed(1)} mm`} color={col} />
          )}
          {alert.data.suggestedAmountMm !== undefined && (
            <DataChip label="Apply" value={`${alert.data.suggestedAmountMm} mm`} color={C.sage} />
          )}
          {alert.data.currentMoisturePct !== undefined && (
            <DataChip label="Soil moisture" value={`${alert.data.currentMoisturePct?.toFixed(0)}%`} color={C.blue} />
          )}
          {alert.data.recommendedFertilizer && (
            <DataChip
              label="Fertilizer"
              value={alert.data.recommendedFertilizer.name}
              color={C.amber}
            />
          )}
        </div>
      )}

      {/* Actions */}
      {!alert.is_read && (
        <div
          style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onMarkRead(alert.id)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: col,
              background: 'transparent',
              border: `1px solid ${col}44`,
              borderRadius: radius.full,
              padding: '4px 12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Mark as read ✓
          </button>
        </div>
      )}
    </div>
  );
}

function DataChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: color + '11',
        border: `1px solid ${color}22`,
        borderRadius: radius.md,
        padding: '8px 10px',
      }}
    >
      <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}

// ── Alerts Screen ─────────────────────────────────────────────────────────────

const FILTERS = ['All', 'High', 'Medium', 'Low', 'Unread'] as const;
type Filter = typeof FILTERS[number];

export default function Alerts({ navigate }: { navigate: (s: Screen) => void }) {
  const { alerts, unreadCount, loading, markRead, markAllAsRead } = useAlerts();
  const [filter, setFilter] = useState<Filter>('All');
  const [markingAll, setMarkingAll] = useState(false);

  const filtered = alerts.filter(a => {
    if (filter === 'Unread') return !a.is_read;
    if (filter === 'High')   return a.severity === 'high';
    if (filter === 'Medium') return a.severity === 'medium';
    if (filter === 'Low')    return a.severity === 'low';
    return true;
  });

  async function handleMarkAll() {
    setMarkingAll(true);
    try { await markAllAsRead(); } finally { setMarkingAll(false); }
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Farm conditions requiring your attention"
        back="Dashboard"
        onBack={() => navigate('dashboard')}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.sage,
                background: C.sageTint,
                border: `1px solid ${C.sage}33`,
                borderRadius: radius.full,
                padding: '6px 14px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {markingAll ? 'Marking…' : `Mark all read (${unreadCount})`}
            </button>
          ) : null
        }
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f;
          let badge: number | null = null;
          if (f === 'Unread') badge = unreadCount;
          if (f === 'High')   badge = alerts.filter(a => a.severity === 'high' && !a.is_read).length || null;

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: active ? '#fff' : C.inkMuted,
                background: active ? C.sageDeep : C.surface,
                border: `1px solid ${active ? C.sageDeep : C.line}`,
                borderRadius: radius.full,
                padding: '6px 14px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {f}
              {badge ? (
                <span
                  style={{
                    background: f === 'High' ? C.rust : C.amber,
                    color: '#fff',
                    borderRadius: radius.full,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 6px',
                    minWidth: 16,
                    textAlign: 'center',
                  }}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.inkMuted, fontSize: 14 }}>
          Loading alerts…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            background: C.surface,
            borderRadius: radius.xl,
            border: `1px solid ${C.line}`,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
            {filter === 'Unread' ? 'All caught up!' : 'No alerts'}
          </div>
          <div style={{ fontSize: 13, color: C.inkMuted }}>
            {filter === 'Unread'
              ? 'You have no unread alerts at this time.'
              : 'No alerts match this filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(alert => (
            <AlertCard key={alert.id} alert={alert} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </div>
  );
}
