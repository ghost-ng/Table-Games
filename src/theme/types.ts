import type { ViewStyle, ImageSourcePropType } from 'react-native';

export type ThemeName = 'retro' | 'arcade' | 'modern';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  board: string;
  boardAlt: string;
  onPrimary: string;
  focus: string;
  warning: string;
  overlay: string;
  primary: string;
  secondary: string;
  text: string;
  textMuted: string;
  player1: string;
  player2: string;
  border: string;
  success: string;
  error: string;
  accent?: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  accent?: string;
  mono?: string;
}

export interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  full: number;
}

export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ThemeShadows {
  sm: ThemeShadow;
  md: ThemeShadow;
}

export interface ThemeAnimation {
  duration: {
    fast: number;
    medium: number;
    slow: number;
  };
}

export interface ThemeMaterials {
  /** Decorative edge light only; game geometry and state stay in board controls. */
  boardSurface: {
    highlightColor: string;
    highlightOpacity: number;
    insetColor: string;
    insetOpacity: number;
  };
  boardBorderWidth: number;
  cellDepth: number;
  pieceShadowOpacity: number;
  glowColor: string;
  glowOpacity: number;
  selectionTrail: string;
  celebration: string;
}

export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
  fonts: ThemeFonts;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  animation: ThemeAnimation;
  materials: ThemeMaterials;
  backgroundImage?: ImageSourcePropType;
}
