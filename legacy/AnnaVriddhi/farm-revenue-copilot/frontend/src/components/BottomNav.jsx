import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icons.jsx';

const NAV_ITEMS = [
  { to: '/app',          icon: 'home',    label: 'Home'    },
  { to: '/app/capture',  icon: 'camera',  label: 'Capture' },
  { to: '/app/schemes',  icon: 'tag',     label: 'Schemes' },
  { to: '/app/season',   icon: 'chart',   label: 'Season'  },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/app'}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
          aria-label={label}
        >
          <Icon name={icon} size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
