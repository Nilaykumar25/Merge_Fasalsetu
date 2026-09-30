import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import Icon from '../../components/Icons.jsx';

export default function Alert() {
  const alert = {
    id: 1,
    type: 'disease',
    severity: 'urgent',
    icon: '🦠',
    title: 'Powdery mildew detected',
    description: 'Your wheat crop is showing early signs of powdery mildew. Immediate treatment is recommended to prevent spread.',
    affectedArea: '0.5 acres (15% of your wheat field)',
    riskLevel: 'High if untreated — can reduce yield by 20–30%',
    actionDeadline: 'Within 24 hours',
    recommendedAction: 'Apply sulfur dust or neem oil spray. Ensure good air circulation by removing lower leaves.',
    estimatedCost: '₹800–1,200',
    videoGuide: 'Learn how to apply treatment safely',
    contacts: [
      { type: 'District Agriculture Office', phone: '0512-2520534' },
      { type: 'Local Input Dealer', phone: '+91 98765 43210' },
    ],
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="screen-body">
        <div className="detail-header" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-2xl)' }}>
          <div className="detail-header__back">
            <Link to="/app" className="btn btn--ghost btn--sm">
              <Icon name="arrow_left" size={16} />
              Back
            </Link>
          </div>
        </div>

        <div className="content-area detail-content" style={{ alignItems: 'center' }}>

          {/* Alert hero - full attention */}
          <div style={{
            background: 'var(--rust-tint)',
            border: '2px solid var(--color-rust)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-2xl)',
            textAlign: 'center',
            marginBottom: 'var(--space-xl)',
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-lg)' }}>
              {alert.icon}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-rust)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
              marginBottom: 'var(--space-sm)',
            }}>
              ⚠️ URGENT ALERT
            </div>
            <h1 style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-rust)',
              marginBottom: 'var(--space-md)',
              lineHeight: 'var(--leading-tight)',
            }}>
              {alert.title}
            </h1>
            <div style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--ink-muted)',
              lineHeight: 'var(--leading-relaxed)',
              marginBottom: 'var(--space-xl)',
            }}>
              {alert.description}
            </div>
          </div>

          {/* Key facts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            width: '100%',
          }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 'var(--weight-bold)' }}>
                Affected Area
              </div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-rust)', marginTop: 'var(--space-xs)' }}>
                {alert.affectedArea}
              </div>
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 'var(--weight-bold)' }}>
                Action Deadline
              </div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-rust)', marginTop: 'var(--space-xs)' }}>
                {alert.actionDeadline}
              </div>
            </div>
          </div>

          {/* Risk assessment */}
          <section className="detail-section" style={{ width: '100%' }}>
            <h2 className="detail-section__title">Why this matters</h2>
            <div style={{
              background: 'var(--rust-tint)',
              border: '1px solid var(--color-rust)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              fontSize: 'var(--text-base)',
              color: 'var(--color-rust)',
              fontWeight: 'var(--weight-semibold)',
            }}>
              {alert.riskLevel}
            </div>
          </section>

          {/* What to do */}
          <section className="detail-section" style={{ width: '100%' }}>
            <h2 className="detail-section__title">What to do right now</h2>
            <div style={{
              background: 'var(--surface)',
              border: '2px solid var(--color-sage)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
            }}>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-lg)' }}>
                {alert.recommendedAction}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>
                Estimated cost: <strong>{alert.estimatedCost}</strong>
              </div>
            </div>
            <button className="btn btn--primary btn--full" style={{ marginTop: 'var(--space-lg)' }}>
              <Icon name="play" size={16} />
              {alert.videoGuide}
            </button>
          </section>

          {/* Get help */}
          <section className="detail-section" style={{ width: '100%' }}>
            <h2 className="detail-section__title">Get help</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {alert.contacts.map((contact, idx) => (
                <a
                  key={idx}
                  href={`tel:${contact.phone}`}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background-color var(--dur-normal) var(--ease-out)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <Icon name="phone" size={20} style={{ color: 'var(--color-sage)' }} />
                  <div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}>
                      {contact.type}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>
                      {contact.phone}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Acknowledge */}
          <section className="detail-section" style={{ width: '100%' }}>
            <button className="btn btn--primary btn--full">
              <Icon name="check" size={16} />
              I'll take action
            </button>
            <button className="btn btn--ghost btn--full">
              Snooze for 1 hour
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}
