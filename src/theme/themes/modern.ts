import type { Theme } from '../types';

export const modernTheme: Theme = {
  name: 'modern',
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#F3F4F6',
    board: '#E8EEF8',
    boardAlt: '#C7D5EC',
    onPrimary: '#FFFFFF',
    focus: '#1A56DB',
    warning: '#92400E',
    overlay: 'rgba(17, 24, 39, 0.64)',
    primary: '#1A56DB',
    secondary: '#6366F1',
    text: '#111827',
    textMuted: '#6B7280',
    player1: '#DC2626',
    player2: '#1A56DB',
    border: '#E5E7EB',
    success: '#059669',
    error: '#DC2626',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    mono: 'JetBrainsMono',
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
  },
  animation: {
    duration: {
      fast: 150,
      medium: 300,
      slow: 500,
    },
  },
  backgroundImage: require('../../../assets/textures/modern-bg.webp'),
};
