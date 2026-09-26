import { createContext } from 'react';
import type { Theme, ThemeName } from './types';
import { modernTheme } from './themes/modern';

export interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: modernTheme,
  themeName: 'modern',
  setTheme: () => {},
});
