import { useEffect, useState } from 'react';
import { C, radius, shadow } from '../tokens';
import { useAlerts } from '../contexts/AlertsContext';

/** Auto-dismissing toast for high-priority alerts */
export function AlertToastStack() {
  const { toasts, dismissToast, markRead } = useAlerts();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 380,
        pointerEvents: 'none',
      }}
    >
      {toasts.slice(0, 3).map(toast => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          title={toast.title}
          message={toast.message}
          severity={toast.severity}
          onDismiss={dismissToast}
          onRead={markRead}
        />
      ))}
    </div>
  );
}

function ToastItem({
  id, title, message, severity, onDismiss, onRead,
}: {
  id: string;
  title: string;
  message: string;
  severity: string;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  const borderColor = severity === 'high' ? C.rust : severity === 'medium' ? C.amber : C.sage;
  const bgColor     = severity === 'high' ? C.rustTint : severity === 'medium' ? C.amberTint : C.sageTint;
  const icon        = severity === 'high' ? '🔴' : severity === 'medium' ? '🟠' : '🟢';

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss after 8 s
  useEffect(() => {
    const t = setTimeout(() => handleDismiss(), 8_000);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(id), 300);
  }

  function handleRead() {
    onRead(id);
    handleDismiss();
  }

  return (
    <div
      style={{
        pointerEvents: 'all',
        background: bgColor,
        border: `1.5px solid ${borderColor}55`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: radius.lg,
        padding: '14px 16px',
        boxShadow: shadow.lg,
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.ink,
              marginBottom: 3,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.inkMuted,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {message}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleRead}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: borderColor,
                background: 'transparent',
                border: `1px solid ${borderColor}44`,
                borderRadius: 999,
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Got it ✓
            </button>
            <button
              onClick={handleDismiss}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: C.inkMuted,
                background: 'transparent',
                border: `1px solid ${C.line}`,
                borderRadius: 999,
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: C.inkMuted,
            fontSize: 14,
            padding: '0 2px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
