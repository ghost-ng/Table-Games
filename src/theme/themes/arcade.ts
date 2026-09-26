import type { Theme } from '../types';

export const arcadeTheme: Theme = {
  name: 'arcade',
  colors: {
    background: '#0A0A1A',
    surface: '#1A1A2E',
    surfaceRaised: '#24243D',
    surfaceSunken: '#101022',
    board: '#18182E',
    boardAlt: '#333355',
    onPrimary: '#0A0A1A',
    focus: '#00E5FF',
    warning: '#FFD166',
    overlay: 'rgba(10, 10, 26, 0.82)',
    primary: '#FF2E8B',
    secondary: '#00E5FF',
    text: '#EEEEFF',
    textMuted: '#8888AA',
    player1: '#FF2E8B',
    player2: '#00E5FF',
    border: '#333355',
    success: '#00FF88',
    error: '#FF3333',
    accent: '#BFFF00',
  },
  fonts: {
    heading: 'PressStart2P',
    body: 'SpaceGrotesk',
    accent: undefined,
  },
  borderRadius: {
    sm: 2,
    md: 4,
    lg: 4,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#FF2E8B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor: '#FF2E8B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 6,
    },
  },
  animation: {
    duration: {
      fast: 100,
      medium: 250,
      slow: 400,
    },
  },
  backgroundImage: require('../../../assets/textures/arcade-bg.webp'),
};
