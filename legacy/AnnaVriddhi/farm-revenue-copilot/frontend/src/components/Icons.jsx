/**
 * Icons.jsx — single inline SVG icon set.
 * All icons share one stroke voice: 1.5px stroke, round joins/caps, no fill.
 * Usage: <Icon name="drop" size={24} />
 */
import React from 'react';

const paths = {
  // Water drop — irrigation
  drop: (
    <path
      d="M12 3 C12 3 5 10.5 5 14.5 a7 7 0 0 0 14 0 C19 10.5 12 3 12 3z"
      strokeLinejoin="round"
    />
  ),
  // Sun — weather
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2"  x2="12" y2="5"  />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2"  y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"  />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66" />
      <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"  />
    </>
  ),
  // Sprout / crop stage
  sprout: (
    <path d="M12 21 V10 M12 10 C12 6 7 4 4 6 C7 6 10 8 12 10 M12 10 C12 6 17 4 20 6 C17 6 14 8 12 10" strokeLinejoin="round" />
  ),
  // Camera — capture
  camera: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <circle cx="12" cy="14" r="4" />
      <path d="M8.5 7 L9.5 4 h5 l1 3" strokeLinejoin="round" />
    </>
  ),
  // Tag / scheme
  tag: (
    <path d="M20.59 13.41 l-7.17 7.17 a2 2 0 0 1-2.83 0 L2 12 V2 h10 l8.59 8.59 a2 2 0 0 1 0 2.82z M7 7h.01" strokeLinejoin="round" />
  ),
  // Chart bar — season review
  chart: (
    <path d="M3 3 v18 h18 M7 16 v-4 M11 16 V8 M15 16 v-6 M19 16 v-9" strokeLinejoin="round" />
  ),
  // Home
  home: (
    <path d="M3 12 L12 3 L21 12 M5 10 v9 a1 1 0 0 0 1 1 h4 v-5 h4 v5 h4 a1 1 0 0 0 1-1 v-9" strokeLinejoin="round" />
  ),
  // Bell — alerts
  bell: (
    <>
      <path d="M18 8 A6 6 0 0 0 6 8 c0 7-3 9-3 9 h18 s-3-2-3-9" strokeLinejoin="round" />
      <path d="M13.73 21 a2 2 0 0 1-3.46 0" />
    </>
  ),
  // Check — mark done
  check: (
    <path d="M20 6 L9 17 l-5-5" strokeLinejoin="round" />
  ),
  // X — not now
  x: (
    <path d="M18 6 L6 18 M6 6 l12 12" strokeLinejoin="round" />
  ),
  // Arrow right
  arrow_right: (
    <path d="M5 12 h14 M12 5 l7 7-7 7" strokeLinejoin="round" />
  ),
  // Calendar
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </>
  ),
  // Upload
  upload: (
    <path d="M21 15 v4 a2 2 0 0 1-2 2 H5 a2 2 0 0 1-2-2 v-4 M17 8 l-5-5-5 5 M12 3 v12" strokeLinejoin="round" />
  ),
  // Leaf — grading
  leaf: (
    <path d="M17 8 C17 8 20 3 12 3 S3 12 3 12 c0 5 4 9 9 9 a9 9 0 0 0 9-9 M3 12 l9 9" strokeLinejoin="round" />
  ),
  // Sensor / signal
  signal: (
    <>
      <path d="M2 12 C2 12 5.5 5 12 5 S22 12 22 12" />
      <path d="M5 15 C5 15 7.5 10 12 10 S19 15 19 15" />
      <circle cx="12" cy="18" r="2" />
    </>
  ),
  // Message bubble
  message: (
    <path d="M21 15 a2 2 0 0 1-2 2 H7 l-4 4 V5 a2 2 0 0 1 2-2 h14 a2 2 0 0 1 2 2z" strokeLinejoin="round" />
  ),
  // Rupee
  rupee: (
    <path d="M6 3 h12 M6 8 h12 M15 3 C15 11 9 14 6 21 M9.5 8 L18 21" strokeLinejoin="round" />
  ),
};

export default function Icon({ name, size = 24, className = '', 'aria-hidden': ariaHidden = true }) {
  const content = paths[name];
  if (!content) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      {content}
    </svg>
  );
}
