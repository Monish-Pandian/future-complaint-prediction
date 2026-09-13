import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavigationForRole } from '../../config/navigation';
import {
  CollapseLeftIcon,
  CollapseRightIcon,
  LogoutIcon,
} from '../common/Icons';

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navConfig = getNavigationForRole(user?.role);

  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Application Sidebar"
    >
      {/* Header / Brand */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-title">CIVIC FORECASTING</div>
          <div className="sidebar-brand-subtitle">{navConfig.subtitle || 'URBAN INTELLIGENCE'}</div>
          <div className="sidebar-status">
            <div className="sidebar-status-dot" aria-hidden="true" />
            <span>OPERATIONAL</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="sidebar-collapse-btn"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <CollapseRightIcon /> : <CollapseLeftIcon />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav" aria-label="Role Navigation">
        {navConfig.groups?.map((grp) => (
          <div key={grp.group} className="nav-group-section">
            <div className="nav-section-label">{grp.group}</div>
            {grp.items.map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard' || item.path === '/officer'}
                  onClick={onCloseMobile}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-icon" aria-hidden="true">
                    <IconComponent />
                  </div>
                  <span className="nav-label">{item.label}</span>
                  {collapsed && (
                    <div className="sidebar-nav-tooltip" role="tooltip">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / User Profile Card & Logout */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar" aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          <div className="user-info">
            <div className="user-name" title={user?.name || 'Operator'}>
              {user?.name || 'Authorized Operator'}
            </div>
            <div className="user-role">
              {user?.role || 'OFFICER'}
              {user?.department ? ` • ${user.department}` : ''}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-logout-btn"
          title="Sign out of system"
        >
          <LogoutIcon />
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
}
