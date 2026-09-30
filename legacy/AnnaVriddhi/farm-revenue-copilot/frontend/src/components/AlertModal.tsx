import { useEffect, useState, useRef } from 'react';
import { C, radius, shadow } from '../tokens';
import { useAlerts, type FarmerAlert } from '../contexts/AlertsContext';

/**
 * Full-screen modal popup that appears over any screen when a new
 * high or medium priority alert arrives. The farmer can navigate to
 * the Alerts page or dismiss it.
 */
export function AlertModal({ onNavigateToAlerts }: { onNavigateToAlerts: () => void }) {
  const { toasts, dismissToast, markRead } = useAlerts();
  const [current, setCurrent] = useState<FarmerAlert | null>(null);
  const [visible, setVisible] = useState(false);
  const shownIds = useRef<Set<string>>(new Set());

  // Pick the first toast that hasn't been shown as a modal yet
  useEffect(() => {
    if (current) return; // already showing one
    const next = toasts.find(t => !shownIds.current.has(t.id));
    if (next) {
      shownIds.current.add(next.id);
      setCurrent(next);
      // Small delay so CSS transition fires
      setTimeout(() => setVisible(true), 40);
    }
  }, [toasts, current]);

  if (!current) return null;

  const isHigh   = current.severity === 'high';
  const isMedium = current.severity === 'medium';
  const borderCol = isHigh ? C.rust : isMedium ? C.amber : C.sage;
  const bgGrad    = isHigh
    ? `linear-gradient(135deg, ${C.rustTint}, #fff9f8)`
    : isMedium
      ? `linear-gradient(135deg, ${C.amberTint}, #fffdf7)`
      : `linear-gradient(135deg, ${C.sageTint}, #f8faf7)`;
  const dot       = isHigh ? '🔴' : isMedium ? '🟠' : '🟢';
  const typeIcon  = current.type.startsWith('npk') ? '⊕'
    : current.type === 'irrigation' ? '≈'
    : current.type === 'pest'       ? '⚠'
    : current.type === 'disease'    ? '🦠'
    : '◈';

  function handleClose() {
    setVisible(false);
    setTimeout(() => {
      dismissToast(current!.id);
      setCurrent(null);
    }, 280);
  }

  function handleGotIt() {
    markRead(current!.id);
    handleClose();
  }

  function handleViewDetails() {
    markRead(current!.id);
    handleClose();
    onNavigateToAlerts();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(36,38,33,0.45)',
          zIndex: 10000,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s ease',
          backdropFilter: visible ? 'blur(2px)' : 'none',
        }}
      />

      {/* Modal card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: visible
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -48%) scale(0.94)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
          zIndex: 10001,
          width: 'min(440px, calc(100vw - 48px))',
          background: bgGrad,
          border: `2px solid ${borderCol}44`,
          borderTop: `4px solid ${borderCol}`,
          borderRadius: radius.xxl,
          boxShadow: shadow.lg + `, 0 0 0 1px ${borderCol}22`,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 24px 0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          {/* Icon circle */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.lg,
              background: borderCol + '1a',
              border: `1.5px solid ${borderCol}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {typeIcon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Severity badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 11 }}>{dot}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: borderCol,
                  background: borderCol + '18',
                  padding: '2px 8px',
                  borderRadius: radius.full,
                }}
              >
                {current.severity} priority
              </span>
              <span style={{ fontSize: 10, color: C.inkMuted, marginLeft: 'auto' }}>
                Farm Alert
              </span>
            </div>

            {/* Title */}
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 800,
                color: C.ink,
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
              }}
            >
              {current.title}
            </div>
          </div>

          {/* Close ×  */}
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: C.inkMuted,
              fontSize: 20,
              padding: '0 2px',
              lineHeight: 1,
              flexShrink: 0,
              marginTop: -2,
            }}
          >
            ×
          </button>
        </div>

        {/* Message */}
        <div
          style={{
            padding: '14px 24px 0',
            fontSize: 13,
            color: C.inkMuted,
            lineHeight: 1.65,
          }}
        >
          {current.message}
        </div>

        {/* Key data chips (if available) */}
        {current.data && Object.keys(current.data).length > 0 && (
          <div
            style={{
              margin: '14px 24px 0',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {current.data.currentValue !== undefined && (
              <Chip label="Current" value={`${current.data.currentValue} kg/ac`} color={borderCol} />
            )}
            {current.data.healthyRange && (
              <Chip label="Healthy range" value={current.data.healthyRange} color={C.sage} />
            )}
            {current.data.deficitMm !== undefined && (
              <Chip label="Deficit" value={`${current.data.deficitMm.toFixed(1)} mm`} color={borderCol} />
            )}
            {current.data.suggestedAmountMm !== undefined && (
              <Chip label="Apply" value={`${current.data.suggestedAmountMm} mm`} color={C.sage} />
            )}
            {current.data.currentMoisturePct !== undefined && (
              <Chip label="Moisture" value={`${Number(current.data.currentMoisturePct).toFixed(0)}%`} color={C.blue} />
            )}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            padding: '18px 24px 22px',
            display: 'flex',
            gap: 10,
            marginTop: 4,
          }}
        >
          <button
            onClick={handleViewDetails}
            style={{
              flex: 1,
              padding: '11px 0',
              background: borderCol,
              color: '#fff',
              border: 'none',
              borderRadius: radius.lg,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              boxShadow: `0 4px 12px ${borderCol}44`,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            View Full Alert →
          </button>
          <button
            onClick={handleGotIt}
            style={{
              padding: '11px 18px',
              background: 'transparent',
              color: C.inkMuted,
              border: `1.5px solid ${C.line}`,
              borderRadius: radius.lg,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            Got it ✓
          </button>
        </div>
      </div>
    </>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: color + '12',
        border: `1px solid ${color}22`,
        borderRadius: radius.md,
        padding: '5px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <span style={{ fontSize: 9, color: C.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</span>
    </div>
  );
}
