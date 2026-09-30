import React from 'react';

/**
 * Gauge — circular/arc progress indicator used for revenue %, health score, etc.
 *
 * Props:
 *   value   {number}  0–100
 *   label   {string}  text beneath the gauge
 *   color   {string}  CSS color override (optional)
 */
export default function Gauge({ value = 0, label = '', color }) {
  return (
    <div className="gauge" aria-label={`${label}: ${value}%`}>
      {/* TODO: SVG arc implementation */}
      <span className="gauge__value">{value}%</span>
      {label && <span className="gauge__label">{label}</span>}
    </div>
  );
}
