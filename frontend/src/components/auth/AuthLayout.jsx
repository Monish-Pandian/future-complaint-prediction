import React from 'react';
import AuthBackground from './AuthBackground';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <AuthBackground />
      {children}
    </div>
  );
}
