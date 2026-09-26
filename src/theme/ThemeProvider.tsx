import React, { useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Theme, ThemeName } from './types';
import { ThemeContext, type ThemeContextValue } from './ThemeContext';
import { retroTheme } from './themes/retro';
import { arcadeTheme } from './themes/arcade';
import { modernTheme } from './themes/modern';

const STORAGE_KEY = 'app_theme';

const themes: Record<ThemeName, Theme> = {
  retro: retroTheme,
  arcade: arcadeTheme,
  modern: modernTheme,
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>('modern');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'retro' || saved === 'arcade' || saved === 'modern')) {
        setThemeName(saved);
      }
    });
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    AsyncStorage.setItem(STORAGE_KEY, name);
  }, []);

  const value: ThemeContextValue = {
    theme: themes[themeName],
    themeName,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return context;
}
