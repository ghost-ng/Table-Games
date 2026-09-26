import type { Theme } from '../types';

export const retroTheme: Theme = {
  name: 'retro',
  colors: {
    background: '#F5F0E8',
    surface: '#E8DFD0',
    primary: '#4A7C59',
    secondary: '#8B6914',
    text: '#2C2416',
    textMuted: '#7A6B56',
    player1: '#C75B39',
    player2: '#2E6B8A',
    border: '#B8A88A',
    success: '#5B8C5A',
    error: '#B84233',
  },
  fonts: {
    heading: 'Fredoka',
    body: 'Fredoka',
    accent: 'PatrickHand',
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#7A6B56',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#7A6B56',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 4,
    },
  },
  animation: {
    duration: {
      fast: 150,
      medium: 300,
      slow: 500,
    },
  },
  backgroundImage: require('../../../assets/textures/retro-bg.webp'),
};
