import React from 'react';
import Icon from './Icons.jsx';

/**
 * GaugeRow — fuel-gauge-style bar for continuous signals.
 * Props:
 *   icon     {string}   Icon name
 *   label    {string}   e.g. "Moisture"
 *   value    {number}   0–100
 *   status   {string}   "low" | "mid" | "good"
 *   detail   {string}   optional text shown to the right (e.g. "Sunny")
 */
export default function GaugeRow({ icon, label, value = 0, status = 'good', detail }) {
  const barClass = `gauge-row__bar gauge-row__bar--${status}`;
  // ARIA: announce label + semantic level, not raw percentage
  const levelLabel = status === 'good' ? 'good' : status === 'mid' ? 'moderate' : 'low';
  return (
    <div className="gauge-row" role="meter" aria-label={`${label}: ${levelLabel}`}
         aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span className="gauge-row__icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="gauge-row__label">{label}</span>
      {detail ? (
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-medium)',
                       color: 'var(--ink-muted)', flexShrink: 0 }}>
          {detail}
        </span>
      ) : (
        <div className="gauge-row__bar-wrap" aria-hidden="true">
          <div className={barClass} style={{ width: `${value}%` }} />
        </div>
      )}
    </div>
  );
}
