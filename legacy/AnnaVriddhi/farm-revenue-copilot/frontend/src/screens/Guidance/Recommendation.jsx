import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import Icon from '../../components/Icons.jsx';

export default function Recommendation() {
  const rec = {
    id: 1,
    type: 'irrigation',
    title: 'Water your wheat today',
    body: 'Soil moisture will drop below safe levels in the next 48 hours. Irrigating now will protect your expected yield.',
    urgency: 'high',
    revenue: { value: '₹400–500', description: 'Expected value protected this week' },
    whyNow: 'Your soil moisture is at 62%, and with the current weather pattern, it will reach critical levels by tomorrow evening.',
    actions: [
      { label: 'Irrigate field', detail: 'Standard 40mm depth recommended' },
      { label: 'Check water source', detail: 'Ensure adequate pressure in supply' },
      { label: 'Monitor post-irrigation', detail: 'Watch for runoff or drainage issues' },
    ],
    relatedCrop: 'Wheat (HD-3086)',
    frequency: 'Repeat as needed based on soil conditions',
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="screen-body">
        <div className="detail-header">
          <div className="detail-header__back">
            <Link to="/app" className="btn btn--ghost btn--sm">
              <Icon name="arrow_left" size={16} />
              Back
            </Link>
          </div>
          <h1 className="detail-header__title">{rec.title}</h1>
        </div>

        <div className="content-area detail-content">

          {/* Recommendation card */}
          <div className="rec-card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="rec-card__header">
              <div className="rec-card__icon">💧</div>
              <div className="rec-card__title">{rec.title}</div>
            </div>
            <div className="rec-card__body">{rec.body}</div>
            <div className="rec-card__revenue">
              <Icon name="rupee" size={14} />
              {rec.revenue.value} — {rec.revenue.description}
            </div>
          </div>

          {/* Why now section */}
          <section className="detail-section">
            <h2 className="detail-section__title">Why now?</h2>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              fontSize: 'var(--text-base)',
              color: 'var(--ink-muted)',
              lineHeight: 'var(--leading-relaxed)',
            }}>
              {rec.whyNow}
            </div>
          </section>

          {/* Action steps */}
          <section className="detail-section">
            <h2 className="detail-section__title">What to do</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {rec.actions.map((action, idx) => (
                <div key={idx} className="gauge-row" style={{ padding: 'var(--space-lg)', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', marginBottom: 0 }}>
                  <Icon name="check" size={20} style={{ color: 'var(--color-sage)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-ink)' }}>
                      {action.label}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {action.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Details */}
          <section className="detail-section">
            <h2 className="detail-section__title">Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 'var(--weight-semibold)' }}>
                  Crop
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', marginTop: 'var(--space-xs)' }}>
                  {rec.relatedCrop}
                </div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 'var(--weight-semibold)' }}>
                  Frequency
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', marginTop: 'var(--space-xs)' }}>
                  {rec.frequency}
                </div>
              </div>
            </div>
          </section>

          {/* Action buttons */}
          <section className="detail-section">
            <button className="btn btn--primary btn--full">
              <Icon name="check" size={16} />
              Mark as done
            </button>
            <button className="btn btn--ghost btn--full">
              Remind me later
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}
