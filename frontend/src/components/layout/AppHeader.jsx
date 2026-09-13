import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MenuIcon } from '../common/Icons';
import ThemeToggle from '../common/ThemeToggle';

const ROUTE_TITLES = {
  '/dashboard': { title: 'COMMAND OVERVIEW', breadcrumb: 'COMMAND CENTER / OVERVIEW' },
  '/predictions': { title: 'PREDICTED COMPLAINTS', breadcrumb: 'INTELLIGENCE / PREDICTIONS' },
  '/officer-performance': { title: 'OFFICER PERFORMANCE', breadcrumb: 'ANALYTICS / PERFORMANCE' },
  '/heatmap': { title: 'SPATIAL RISK HEATMAP', breadcrumb: 'INTELLIGENCE / SPATIAL HEATMAP' },
  '/officers': { title: 'OFFICER REGISTRY', breadcrumb: 'OPERATIONS / OFFICERS' },
  '/assignments': { title: 'AI DISPATCH ASSIGNMENTS', breadcrumb: 'OPERATIONS / ASSIGNMENTS' },
  '/verification': { title: 'FIELD VERIFICATION LOGS', breadcrumb: 'OPERATIONS / VERIFICATION' },
  '/evaluation': { title: 'AI MODEL EVALUATION', breadcrumb: 'ANALYTICS / MODEL EVALUATION' },
  '/officer': { title: 'FIELD DISPATCH DASHBOARD', breadcrumb: 'FIELD OPERATIONS / OVERVIEW' },
  '/officer/complaints': { title: 'ASSIGNED COMPLAINTS', breadcrumb: 'FIELD OPERATIONS / TASK QUEUE' },
  '/officer/heatmap': { title: 'DEPARTMENT HEATMAP', breadcrumb: 'FIELD OPERATIONS / SPATIAL ACTIVITY' },
};

export default function AppHeader({ onToggleMobile }) {
  const { user } = useAuth();
  const location = useLocation();

  const currentRouteInfo = ROUTE_TITLES[location.pathname] || {
    title: 'COMMAND CENTER',
    breadcrumb: 'CIVIC INTELLIGENCE / OPERATIONS',
  };

  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="app-header" aria-label="Application Header">
      <div className="header-left">
        <button
          type="button"
          onClick={onToggleMobile}
          className="mobile-menu-button"
          aria-label="Open navigation drawer"
        >
          <MenuIcon />
        </button>

        <div>
          <div className="header-breadcrumb">{currentRouteInfo.breadcrumb}</div>
          <h1 className="header-page-title">{currentRouteInfo.title}</h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Quick Search Shortcut Bar */}
        <div className="header-quick-search" role="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search command center..."
            className="header-search-input"
            aria-label="Quick search"
          />
          <kbd className="header-search-kbd">⌘K</kbd>
        </div>

        {/* Global Light / Dark Mode Toggle */}
        <ThemeToggle />

        {/* Operational Status Pill */}
        <div className="system-status">
          <div className="system-status-dot" aria-hidden="true" />
          <span>LIVE CONNECTED</span>
        </div>

        {/* User Identity Chip */}
        <div className="header-user-badge">
          <div className="header-user-avatar" aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          <div className="header-user-text">
            <span className="header-user-name">{user?.name || 'Operator'}</span>
            <span className="header-user-role">{user?.role || 'OFFICER'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
