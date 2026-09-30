import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import Icon from './Icons.jsx';

const NAV = [
  { to: '/app',           icon: 'home',    label: 'Dashboard', end: true },
  { to: '/app/capture',   icon: 'camera',  label: 'Capture'             },
  { to: '/app/schemes',   icon: 'tag',     label: 'Schemes'             },
  { to: '/app/season',    icon: 'chart',   label: 'Season Review'       },
];

export default function Sidebar({ alertCount = 0 }) {
  return (
    <aside className="sidebar" aria-label="App navigation">
      <Link to="/" className="sidebar__logo">
        <div className="sidebar__logo-mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22V12M12 12C12 8 7 6 4 8C7 8 10 10 12 12M12 12C12 8 17 6 20 8C17 8 14 10 12 12"/>
          </svg>
        </div>
        <span className="sidebar__logo-name">AnnaVriddhi</span>
      </Link>

      <nav className="sidebar__nav">
        {NAV.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar__item${isActive ? ' sidebar__item--active' : ''}`
            }
          >
            <Icon name={icon} size={18} />
            {label}
            {label === 'Dashboard' && alertCount > 0 && (
              <span className="sidebar-alert" aria-label={`${alertCount} alerts`}>
                {alertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        Kharif 2026 · Ramesh Kumar
      </div>
    </aside>
  );
}
