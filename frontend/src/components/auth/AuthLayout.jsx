import React from 'react';
import AuthBackground from './AuthBackground';
import ThemeToggle from '../common/ThemeToggle';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      {/* Topbar Action: Theme Switcher */}
      <div className="auth-topbar-actions">
        <ThemeToggle />
      </div>

      <AuthBackground />
      {children}
    </div>
  );
}
