import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme] = useState('dark');

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('civic_theme', 'dark');
    } catch (e) {
      console.warn('Could not persist theme preference:', e);
    }
  }, []);

  const toggleTheme = () => {
    // COMAI is permanently dark mode only
  };

  const isDark = true;

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
