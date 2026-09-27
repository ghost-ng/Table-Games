import type { ThemeMaterials, ThemeName } from './types';

// Keep semantic values independent of bitmap requires and the native runtime.
export const THEME_MATERIALS: Record<ThemeName, ThemeMaterials> = {
  modern: {
    boardBorderWidth: 1,
    cellDepth: 2,
    pieceShadowOpacity: 0.1,
    glowColor: '#1A56DB',
    glowOpacity: 0,
    selectionTrail: '#1A56DB',
    celebration: '#059669',
  },
  retro: {
    boardBorderWidth: 2,
    cellDepth: 3,
    pieceShadowOpacity: 0.2,
    glowColor: '#4A7C59',
    glowOpacity: 0,
    selectionTrail: '#2E6B8A',
    celebration: '#5B8C5A',
  },
  arcade: {
    boardBorderWidth: 2,
    cellDepth: 2,
    pieceShadowOpacity: 0.24,
    glowColor: '#00E5FF',
    glowOpacity: 0.24,
    selectionTrail: '#00E5FF',
    celebration: '#00FF88',
  },
};
