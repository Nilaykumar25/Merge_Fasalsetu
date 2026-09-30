import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icons.jsx';

/**
 * TopBar — sticky app top bar.
 * Props:
 *   title       {string}
 *   alertCount  {number}   shows red dot if > 0
 *   showBack    {boolean}  shows a back arrow instead of alert bell
 */
export default function TopBar({ title, alertCount = 0, showBack = false }) {
  const navigate = useNavigate();

  return (
    <header className="top-bar">
      <span className="top-bar__title">{title}</span>
      {showBack ? (
        <button
          className="top-bar__action"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{ cursor: 'pointer' }}
        >
          <Icon name="arrow_right" size={22} style={{ transform: 'rotate(180deg)' }} />
        </button>
      ) : (
        <button className="top-bar__action" aria-label={`${alertCount} alerts`}>
          <div className="alert-dot">
            <Icon name="bell" size={22} />
            {alertCount > 0 && (
              <span className="alert-dot__count" aria-hidden="true">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </div>
        </button>
      )}
    </header>
  );
}
