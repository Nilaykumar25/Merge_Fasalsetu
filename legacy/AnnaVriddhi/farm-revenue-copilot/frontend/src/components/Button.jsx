import React from 'react';

/**
 * Button — primary action button with variant support.
 *
 * Props:
 *   children  {ReactNode}
 *   variant   {string}    "primary" | "secondary" | "danger"
 *   disabled  {boolean}
 *   onClick   {function}
 *   type      {string}    "button" | "submit" | "reset"
 */
export default function Button({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  type = 'button',
}) {
  return (
    <button
      className={`btn btn--${variant}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
