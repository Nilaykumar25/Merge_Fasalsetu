import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icons.jsx';
import '../../styles/landing.css';

/* ── App preview card (hero right) ──────────────────────────────────── */
function AppPreview() {
  return (
    <div className="l-hero__preview" aria-label="App preview" role="img">
      <div className="l-preview__topbar">
        <div className="l-preview__topbar-title">
          <span className="l-preview__topbar-dot" />
          AnnaVriddhi
        </div>
      </div>

      <div className="l-preview__status">
        <div className="l-preview__status-icon">🌱</div>
        <div className="l-preview__status-text">
          <div className="l-preview__status-headline">All clear today</div>
          <div className="l-preview__status-sub">Your wheat crop looks healthy</div>
        </div>
      </div>

      <div className="l-preview__gauges">
        {[
          { label: 'Moisture',   pct: 62, color: 'var(--color-sage)'  },
          { label: 'Weather',    pct: 85, color: 'var(--amber)' },
          { label: 'Crop stage', pct: 55, color: 'var(--color-sage)'  },
        ].map(g => (
          <div key={g.label} className="l-preview__gauge-row">
            <span className="l-preview__gauge-label">{g.label}</span>
            <div className="l-preview__gauge-bar">
              <div className="l-preview__gauge-fill" style={{ width: `${g.pct}%`, background: g.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="l-preview__rec">
        <div className="l-preview__rec-header">
          <Icon name="drop" size={16} style={{ color: 'var(--sage)', flexShrink: 0, marginTop: 1 }} />
          <div className="l-preview__rec-title">Water your wheat today</div>
        </div>
        <div className="l-preview__rec-body">
          Soil moisture will drop below safe levels in 48 hours. Irrigate now to protect yield.
        </div>
        <div className="l-preview__rec-revenue">Acting now could protect ₹400–500 of expected yield.</div>
        <div className="l-preview__rec-actions">
          <div className="l-preview__rec-btn l-preview__rec-btn--primary">Mark done</div>
          <div className="l-preview__rec-btn">Not now</div>
        </div>
      </div>
    </div>
  );
}

/* ── Flow strip ──────────────────────────────────────────────────────── */
const FLOW_STEPS = [
  { num: '1', label: 'Sense',   desc: 'Sensor + photo + weather'     },
  { num: '2', label: 'Advise',  desc: 'Plain-language recommendation' },
  { num: '3', label: 'Act',     desc: 'One-tap confirmation'          },
  { num: '4', label: 'Earn',    desc: 'Season revenue review'         },
];

/* ── How it works steps ──────────────────────────────────────────────── */
const HOW_STEPS = [
  {
    num: '1', stage: 'Sense',
    title: 'We watch your field continuously',
    body: 'Sensor readings, field photos, and local weather are combined automatically. The system checks every few hours — you don\'t need to log anything.',
    visual: null,
  },
  {
    num: '2', stage: 'Advise',
    title: 'You get told what to do — or that everything\'s fine',
    body: 'A plain message explains what to do, why, and what it\'s worth. If nothing needs attention, we say that too — so silence doesn\'t mean "app is broken."',
    visual: 'sms',
  },
  {
    num: '3', stage: 'Act',
    title: 'One tap to confirm',
    body: 'Mark it done. The system records when you acted and adjusts what comes next. No forms, no data entry.',
    visual: null,
  },
  {
    num: '4', stage: 'Review',
    title: 'See what the season was worth',
    body: 'End-of-season summary: what you followed, what you skipped, and the difference in rupees.',
    visual: 'season',
  },
];

/* ── Feature bento cells ─────────────────────────────────────────────── */
const FEATURES = [
  { icon: 'signal',   title: 'Continuous monitoring',       body: 'Sensor + photo + weather, refreshed every few hours.',    span: 'wide',  variant: '' },
  { icon: 'rupee',    title: '₹ — every recommendation',    body: 'Every suggestion comes with an estimated rupee value.',   span: 'mid',   variant: 'tint' },
  { icon: 'drop',     title: 'Irrigation timing',           body: 'Act before moisture drops — not after.',                  span: 'third', variant: '' },
  { icon: 'leaf',     title: 'Produce grading',             body: 'Photo in, A–D grade out, market price estimate.',         span: 'third', variant: '' },
  { icon: 'calendar', title: 'Harvest window',              body: 'Day-by-day window with weather overlaid.',                span: 'third', variant: 'amber' },
  { icon: 'tag',      title: 'Scheme matching',             body: 'PM-KISAN, Fasal Bima, KCC — matched to your farm.',       span: 'half',  variant: 'dark' },
  { icon: 'chart',    title: 'Season review',               body: 'Full season: what worked, what to improve, next steps.',  span: 'half',  variant: '' },
  { icon: 'message',  title: 'Works over SMS',              body: 'No app or data connection required. Any phone.',          span: 'full',  variant: 'full' },
];

/* ── Contact form ────────────────────────────────────────────────────── */
function ContactForm() {
  const id = useId();
  const [done, setDone] = React.useState(false);
  if (done) return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
                color: 'var(--sage-deep)', fontWeight: 'var(--weight-semibold)',
                fontSize: 'var(--text-lg)' }}>
      <Icon name="check" size={20} /> We'll be in touch soon.
    </p>
  );
  return (
    <form className="l-contact__form" onSubmit={e => { e.preventDefault(); setDone(true); }} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-phone`}>Phone number or email</label>
        <input id={`${id}-phone`} type="text" className="field__input" placeholder="+91 98765 43210" required />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-state`}>State</label>
        <select id={`${id}-state`} className="field__select">
          <option value="">Select state…</option>
          {['Maharashtra','Punjab','Gujarat','Rajasthan','Uttar Pradesh','Madhya Pradesh','Karnataka'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn--primary btn--lg">
        Get in touch
      </button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-faint)' }}>
        We'll set up a demo or trial. No spam.
      </p>
    </form>
  );
}

/* ── Main ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing">

      {/* NAV */}
      <nav className="l-nav" aria-label="Site navigation">
        <a href="/" className="l-nav__logo">
          <div className="l-nav__mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12M12 12C12 8 7 6 4 8C7 8 10 10 12 12M12 12C12 8 17 6 20 8C17 8 14 10 12 12"/>
            </svg>
          </div>
          <span className="l-nav__name">AnnaVriddhi</span>
          <span className="l-nav__tagline">Growing the Value of Every Harvest</span>
        </a>
        <div className="l-nav__links">
          <a href="#how-it-works" className="l-nav__link">How it works</a>
          <a href="#features" className="l-nav__link">Features</a>
          <a href="#contact" className="l-nav__link">Contact</a>
          <Link to="/app" className="btn btn--primary">Open app</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="l-hero" aria-label="Hero">
        <div className="l-hero__left">
          <div className="l-hero__kicker">
            <span className="l-hero__kicker-dot" aria-hidden="true" />
            AI-powered farm revenue copilot
          </div>
          <h1 className="l-hero__h1">
            Growing the Value<br />of <em>Every Harvest</em>.
          </h1>
          <p className="l-hero__sub">
            AnnaVriddhi watches your field around the clock — soil, weather, photos — and
            tells you exactly when to act, in plain language, with a rupee value attached.
          </p>
          <div className="l-hero__actions">
            <Link to="/app" className="btn btn--primary btn--lg">
              Open the app
            </Link>
            <a href="#how-it-works" className="btn btn--ghost btn--lg">
              See how it works
            </a>
          </div>
        </div>
        <div className="l-hero__right" aria-hidden="true">
          <AppPreview />
        </div>
      </section>

      {/* FLOW STRIP */}
      <div className="l-flow" aria-label="Product flow" role="region">
        <div className="l-flow__inner">
          {FLOW_STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="l-flow__step">
                <div className="l-flow__step-num" aria-hidden="true">{s.num}</div>
                <div className="l-flow__step-text">
                  <div className="l-flow__step-label">{s.label}</div>
                  <div className="l-flow__step-desc">{s.desc}</div>
                </div>
              </div>
              {i < FLOW_STEPS.length - 1 && <div className="l-flow__divider" aria-hidden="true" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="l-problem" aria-labelledby="problem-heading">
        <div className="l-problem__inner">
          <div>
            <div className="l-problem__label">The gap</div>
            <h2 className="l-problem__h2" id="problem-heading">
              Advice arrives<br />after the window<br />closes.
            </h2>
          </div>
          <p className="l-problem__body">
            Farmers receive advice at fixed points — from extension workers who visit monthly,
            or from neighbours who noticed the same problem. But soil moisture, disease pressure,
            and weather windows change daily. By the time advice arrives, the opportunity has
            already passed. The gap between <strong style={{ color: '#fff' }}>"when to act"</strong> and
            {' '}<strong style={{ color: '#fff' }}>"when you found out"</strong> is where revenue is lost,
            season after season.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="l-section" id="how-it-works" aria-labelledby="how-heading">
        <div className="l-section__kicker">How it works</div>
        <h2 className="l-section__h2" id="how-heading">
          Four steps. Plain language. Rupees attached.
        </h2>
        <div className="l-how-grid">
          <div>
            {HOW_STEPS.map(step => (
              <div key={step.num} className="l-how-step">
                <div className="l-how-step__num" aria-hidden="true">{step.num}</div>
                <div>
                  <div className="l-how-step__stage">{step.stage}</div>
                  <h3 className="l-how-step__title">{step.title}</h3>
                  <p className="l-how-step__body">{step.body}</p>
                  {step.visual === 'sms' && (
                    <div className="l-sms-mock">
                      <span className="l-sms-mock__tag">Example — not real farmer data</span>
                      <strong>AnnaVriddhi:</strong> Ramesh, your wheat needs water in the next 48 hours.
                      Irrigating now could add around ₹400–500 to your expected yield.
                      Reply <strong>DONE</strong> when finished.
                    </div>
                  )}
                  {step.visual === 'season' && (
                    <div className="l-how-visual__stat" style={{ marginTop: 'var(--space-md)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-faint)', display: 'block', marginBottom: 'var(--space-xs)' }}>
                        Example — illustrative only
                      </span>
                      <div className="l-how-visual__stat-value">11 / 14</div>
                      <div className="l-how-visual__stat-label">recommendations followed this season</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="l-how-right" aria-hidden="true">
            <div className="l-how-visual">
              <div className="l-how-visual__header">
                <Icon name="sprout" size={16} />
                Farm status — Kharif 2026
              </div>
              <div className="l-how-visual__body">
                <div className="l-how-visual__stat">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-faint)', marginBottom: 'var(--space-xs)', display: 'block' }}>
                    Example — illustrative
                  </span>
                  <div className="l-how-visual__stat-value">11/14</div>
                  <div className="l-how-visual__stat-label">recommendations followed</div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {[
                    { label: 'Moisture',   pct: 62, cls: 'good' },
                    { label: 'Crop stage', pct: 55, cls: 'mid'  },
                    { label: 'Pest risk',  pct: 20, cls: 'low'  },
                  ].map(g => (
                    <div key={g.label} className="l-preview__gauge-row">
                      <span className="l-preview__gauge-label">{g.label}</span>
                      <div className="l-preview__gauge-bar">
                        <div className={`gauge-row__bar gauge-row__bar--${g.cls}`} style={{ height: '100%', width: `${g.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section className="l-section" id="features" aria-labelledby="features-heading"
               style={{ paddingTop: 0 }}>
        <div className="l-section__kicker">Features</div>
        <h2 className="l-section__h2" id="features-heading">
          Everything a smallholder farmer needs.
        </h2>
        <div className="l-bento">
          {FEATURES.map(f => (
            <div key={f.title}
                 className={`l-bento__cell l-bento__cell--${f.span}${f.variant ? ` l-bento__cell--${f.variant}` : ''}`}>
              <div className="l-bento__icon" aria-hidden="true">
                <Icon name={f.icon} size={20} />
              </div>
              <div className="l-bento__title">{f.title}</div>
              <div className="l-bento__body">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FIELD CONDITIONS */}
      <div className="l-field" aria-labelledby="field-heading">
        <div className="l-field__inner">
          {[
            { icon: 'signal',  title: 'No data connection required',   body: 'Core advice goes out over SMS. Any phone, anywhere, even with no internet.' },
            { icon: 'message', title: 'Your language',                  body: 'Messages arrive in the language you chose at setup. Devanagari script supported.' },
            { icon: 'sun',     title: 'Readable in the field',          body: 'High contrast, large text, one action at a time. Designed for bright sun on a small screen.' },
          ].map(item => (
            <div key={item.title} className="l-field__item">
              <div className="l-field__icon" aria-hidden="true">
                <Icon name={item.icon} size={28} />
              </div>
              <div className="l-field__title">{item.title}</div>
              <div className="l-field__body">{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SEASON TEASER */}
      <section className="l-section" aria-labelledby="season-heading">
        <div className="l-season-grid">
          <div>
            <div className="l-section__kicker">Season review</div>
            <h2 className="l-section__h2" id="season-heading" style={{ marginBottom: 'var(--space-md)' }}>
              See the full season at a glance.
            </h2>
            <p style={{ fontSize: 'var(--text-xl)', color: 'var(--ink-muted)', lineHeight: 'var(--leading-relaxed)', maxWidth: '44ch' }}>
              At harvest, every recommendation you followed — and every one you skipped —
              maps to an outcome. AnnaVriddhi shows you what the difference was, in rupees.
            </p>
          </div>
          <div className="l-season-card" role="img" aria-label="Example season summary card">
            <div className="l-season-card__header">
              <span className="l-season-card__header-title">Season summary</span>
              <span className="l-season-card__header-sub">Kharif 2026 · Example</span>
            </div>
            <div className="l-season-card__stats">
              {[
                { val: '11/14', label: 'Recommendations followed' },
                { val: '₹ —',  label: 'Estimated value added (metric to confirm)' },
                { val: 'A2',   label: 'Average produce grade' },
                { val: '2',    label: 'Schemes applied for' },
              ].map(s => (
                <div key={s.label} className="l-season-stat">
                  <div className="l-season-stat__value">{s.val}</div>
                  <div className="l-season-stat__label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="l-season-card__footer">
              Illustrative example — not real farmer data
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <div className="l-contact" id="contact">
        <div className="l-contact__inner">
          <div>
            <div className="l-section__kicker">Try it</div>
            <h2 className="l-section__h2">
              Get AnnaVriddhi on your farm.
            </h2>
            <p style={{ fontSize: 'var(--text-xl)', color: 'var(--ink-muted)', lineHeight: 'var(--leading-relaxed)', maxWidth: '44ch', marginBottom: 'var(--space-xl)' }}>
              Built for smallholder farmers with 1–10 acres. Leave your number and we'll be
              in touch to set up a demo or a field trial.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="l-footer">
          <div>
            <span className="l-footer__brand">AnnaVriddhi</span>
            {' '}— Growing the Value of Every Harvest
          </div>
          <span>Hackathon prototype · not a commercial product</span>
        </div>
      </footer>

    </div>
  );
}
