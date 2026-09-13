import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role?.toUpperCase();
    const hasRole = allowedRoles.some((r) => r.toUpperCase() === userRole);

    if (!hasRole) {
      // Role unauthorized: redirect to appropriate destination for this user's role
      if (userRole === 'ADMIN') {
        return <Navigate to="/dashboard" replace />;
      }
      if (userRole === 'OFFICER') {
        return <Navigate to="/officer" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
