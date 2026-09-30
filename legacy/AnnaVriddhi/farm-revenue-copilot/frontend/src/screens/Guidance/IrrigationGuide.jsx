import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import GaugeRow from '../../components/GaugeRow.jsx';
import Icon from '../../components/Icons.jsx';

export default function IrrigationGuide() {
  const irrigation = {
    crop: 'Wheat (HD-3086)',
    currentMoisture: 62,
    criticalLevel: 40,
    safeLevel: 50,
    recommendation: 'Irrigate within 48 hours',
    revenueAtStake: '₹400–500',
    nextCheckIn: '3 days',
  };

  const steps = [
    { num: 1, title: 'Check water source', detail: 'Ensure well/canal has adequate water level' },
    { num: 2, title: 'Clear irrigation channels', detail: 'Remove debris, ensure no blockages' },
    { num: 3, title: 'Set water depth', detail: '40mm depth is recommended for this stage' },
    { num: 4, title: 'Start irrigation', detail: 'Turn on pump/open canal gate' },
    { num: 5, title: 'Monitor runoff', detail: 'Watch for waterlogging or excessive drainage' },
    { num: 6, title: 'Record in app', detail: 'Mark done when irrigation is complete' },
  ];

  const timeline = [
    { day: 'Today', status: 'current', label: 'Current moisture (62%)' },
    { day: 'Tomorrow', status: 'critical', label: 'Critical level (40%) — ACTION NEEDED' },
    { day: '+2 days', status: 'future', label: 'Next check-in' },
  ];

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
          <h1 className="detail-header__title">Irrigation guide</h1>
        </div>

        <div className="content-area detail-content">

          {/* Current moisture status */}
          <section className="detail-section">
            <h2 className="detail-section__title">Soil moisture</h2>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-5xl)', fontWeight: 'var(--weight-bold)', color: 'var(--amber)', fontVariantNumeric: 'tabular-nums' }}>
                {irrigation.currentMoisture}%
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginTop: 'var(--space-sm)' }}>
                Current level — {irrigation.recommendation}
              </div>
            </div>
          </section>

          {/* Moisture timeline */}
          <section className="detail-section">
            <h2 className="detail-section__title">Moisture forecast</h2>
            <div className="timeline">
              {timeline.map((item, idx) => (
                <div key={idx} className="timeline-row">
                  <div className={`timeline-row__dot ${item.status === 'current' ? 'timeline-row__dot--active' : item.status === 'critical' ? 'timeline-row__dot--amber' : ''}`} />
                  <div className="timeline-row__content">
                    <div className="timeline-row__label">{item.label}</div>
                    <div className="timeline-row__date">{item.day}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Revenue at stake */}
          <section className="detail-section">
            <h2 className="detail-section__title">What's at stake</h2>
            <div style={{
              background: 'var(--amber-tint)',
              border: '1px solid oklch(85% 0.040 65)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 'var(--space-xs)' }}>
                If you don't irrigate in time:
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--amber)' }}>
                {irrigation.revenueAtStake}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginTop: 'var(--space-xs)' }}>
                potential loss in yield value
              </div>
            </div>
          </section>

          {/* Step-by-step guide */}
          <section className="detail-section">
            <h2 className="detail-section__title">How to irrigate</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {steps.map((step) => (
                <div key={step.num} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-lg)',
                  display: 'flex',
                  gap: 'var(--space-lg)',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--sage-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--sage-deep)',
                    flexShrink: 0,
                  }}>
                    {step.num}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-ink)' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {step.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Related crop info */}
          <section className="detail-section">
            <h2 className="detail-section__title">Crop details</h2>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-sm)' }}>
                Current crop
              </div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
                {irrigation.crop}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginTop: 'var(--space-md)' }}>
                Next check-in: <strong>{irrigation.nextCheckIn}</strong>
              </div>
            </div>
          </section>

          {/* Action buttons */}
          <section className="detail-section">
            <button className="btn btn--primary btn--full">
              <Icon name="check" size={16} />
              I've irrigated
            </button>
            <button className="btn btn--ghost btn--full">
              Set reminder
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}
