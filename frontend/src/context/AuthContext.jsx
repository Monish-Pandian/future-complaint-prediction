import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser as apiLoginUser, getMe } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('civic_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('civic_auth_token') || null;
  });

  const [loading, setLoading] = useState(false);

  // Sync token changes to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('civic_auth_token', token);
    } else {
      localStorage.removeItem('civic_auth_token');
    }
  }, [token]);

  // Sync user changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('civic_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('civic_user');
    }
  }, [user]);

  const login = useCallback(async (credentials) => {
    const result = await apiLoginUser(credentials);
    const authToken = result?.token;
    const authUser = result?.user;

    if (authToken && authUser) {
      localStorage.setItem('civic_auth_token', authToken);
      localStorage.setItem('civic_user', JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
    }

    return authUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('civic_auth_token');
    localStorage.removeItem('civic_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
