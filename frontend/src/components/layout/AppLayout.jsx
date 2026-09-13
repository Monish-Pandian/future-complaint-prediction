import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';
import PageTransition from './PageTransition';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile Drawer Backdrop (ONLY mounted when mobile menu is open) */}
      {mobileOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Role-Based Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main View Shell */}
      <div className="app-shell">
        <AppHeader onToggleMobile={() => setMobileOpen((prev) => !prev)} />
        <main className="app-main">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
