import React from 'react';

/**
 * Card — generic surface container used throughout the app.
 *
 * Props:
 *   children  {ReactNode}
 *   className {string}     additional class names (optional)
 *   onClick   {function}   makes the card interactive (optional)
 */
export default function Card({ children, className = '', onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`card ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Tag>
  );
}
