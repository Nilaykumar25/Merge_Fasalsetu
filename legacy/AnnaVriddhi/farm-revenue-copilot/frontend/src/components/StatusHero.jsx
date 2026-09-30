import React from 'react';

/**
 * StatusHero — large hero banner showing crop name, current stage,
 * and overall health status with a colour-coded background.
 *
 * Props:
 *   cropName  {string}
 *   stage     {string}  e.g. "Vegetative", "Flowering"
 *   status    {string}  "healthy" | "at-risk" | "critical"
 */
export default function StatusHero({ cropName, stage, status = 'healthy' }) {
  return (
    <section className={`status-hero status-hero--${status}`}>
      <h2 className="status-hero__name">{cropName}</h2>
      <p className="status-hero__stage">{stage}</p>
      <span className="status-hero__badge">{status}</span>
    </section>
  );
}
