import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MenuIcon, SearchIcon } from '../common/Icons';
import ThemeToggle from '../common/ThemeToggle';

const ROUTE_TITLES = {
  '/dashboard': { title: 'COMMAND OVERVIEW', breadcrumb: 'MUNICIPAL TRIAGE / COMMAND CENTER' },
  '/predictions': { title: 'PREDICTED COMPLAINTS', breadcrumb: 'INTELLIGENCE / FORECASTS' },
  '/risk-map': { title: 'SPATIAL RISK HEATMAP', breadcrumb: 'INTELLIGENCE / RISK MAP' },
  '/heatmap': { title: 'SPATIAL RISK HEATMAP', breadcrumb: 'INTELLIGENCE / SPATIAL HEATMAP' },
  '/assignments': { title: 'AI DISPATCH ASSIGNMENTS', breadcrumb: 'OPERATIONS / ASSIGNMENTS' },
  '/verification': { title: 'FIELD VERIFICATION LOGS', breadcrumb: 'OPERATIONS / VERIFICATION' },
  '/verification/candidates': { title: 'VERIFICATION CANDIDATES', breadcrumb: 'OPERATIONS / 90:10 CANDIDATES' },
  '/evaluations': { title: 'AI MODEL EVALUATION', breadcrumb: 'OPERATIONS / EVALUATIONS' },
  '/evaluation': { title: 'AI MODEL EVALUATION', breadcrumb: 'ANALYTICS / MODEL EVALUATION' },
  '/officers': { title: 'FIELD OFFICER OPERATIONS', breadcrumb: 'OPERATIONS / OFFICERS' },
  '/analytics': { title: 'CIVIC OPERATIONS ANALYTICS', breadcrumb: 'INTELLIGENCE / ANALYTICS' },
  '/officer-performance': { title: 'OFFICER PERFORMANCE', breadcrumb: 'ANALYTICS / PERFORMANCE' },
  '/system': { title: 'SYSTEM INTELLIGENCE & GOVERNANCE', breadcrumb: 'MANAGEMENT / SYSTEM' },
  '/profile': { title: 'OPERATOR PROFILE', breadcrumb: 'ACCOUNT / PROFILE' },
  '/officer': { title: 'FIELD DISPATCH DASHBOARD', breadcrumb: 'FIELD OPERATIONS / OVERVIEW' },
  '/officer/dashboard': { title: 'FIELD DISPATCH DASHBOARD', breadcrumb: 'FIELD OPERATIONS / OVERVIEW' },
  '/officer/assignments': { title: 'MY ASSIGNMENTS', breadcrumb: 'FIELD OPERATIONS / MY ASSIGNMENTS' },
  '/officer/complaints': { title: 'ASSIGNED COMPLAINTS', breadcrumb: 'FIELD OPERATIONS / TASK QUEUE' },
  '/officer/verification': { title: 'FIELD VERIFICATION TASKS', breadcrumb: 'FIELD OPERATIONS / VERIFICATION' },
  '/officer/history': { title: 'OPERATIONAL VERIFICATION HISTORY', breadcrumb: 'FIELD OPERATIONS / HISTORY' },
  '/officer/profile': { title: 'OFFICER PROFILE', breadcrumb: 'ACCOUNT / PROFILE' },
  '/officer/heatmap': { title: 'DEPARTMENT HEATMAP', breadcrumb: 'FIELD OPERATIONS / SPATIAL ACTIVITY' },
};

export default function AppHeader({ onToggleMobile }) {
  const { user } = useAuth();
  const location = useLocation();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentRouteInfo = ROUTE_TITLES[location.pathname] || {
    title: 'CIVIC COMMAND CENTER',
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

        <div className="header-title-group">
          <div className="header-breadcrumb">{currentRouteInfo.breadcrumb}</div>
          <h1 className="header-page-title">{currentRouteInfo.title}</h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Quick Search Box */}
        <div className="header-quick-search" role="search">
          <SearchIcon size={13} />
          <input
            type="text"
            placeholder="Quick search..."
            className="header-search-input"
            aria-label="Quick search"
          />
          <kbd className="header-search-kbd">⌘K</kbd>
        </div>

        {/* System Clock */}
        <div className="header-utc-clock" title="System Live Time (UTC)">
          <span>{timeStr || 'LIVE UTC'}</span>
        </div>

        {/* Real Status Pill */}
        <div className="system-status">
          <span className="system-status-dot" aria-hidden="true" />
          <span>ONLINE</span>
        </div>

        {/* User Identity Badge */}
        <div className="header-user-badge">
          <div className="header-user-avatar" aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          <div className="header-user-text">
            <span className="header-user-name">{user?.name || 'Authorized User'}</span>
            <span className="header-user-role">{user?.role || 'OFFICER'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
