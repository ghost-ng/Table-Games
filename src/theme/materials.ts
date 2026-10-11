import type { ThemeMaterials, ThemeName } from './types';

// Keep semantic values independent of bitmap requires and the native runtime.
export const THEME_MATERIALS: Record<ThemeName, ThemeMaterials> = {
  modern: {
    boardSurface: { highlightColor: '#FFFFFF', highlightOpacity: 0.16, insetColor: '#111827', insetOpacity: 0.06 },
    boardBorderWidth: 1,
    cellDepth: 2,
    pieceShadowOpacity: 0.1,
    glowColor: '#1A56DB',
    glowOpacity: 0,
    selectionTrail: '#1A56DB',
    celebration: '#059669',
  },
  retro: {
    boardSurface: { highlightColor: '#FFF9EE', highlightOpacity: 0.18, insetColor: '#7A6B56', insetOpacity: 0.12 },
    boardBorderWidth: 2,
    cellDepth: 3,
    pieceShadowOpacity: 0.2,
    glowColor: '#4A7C59',
    glowOpacity: 0,
    selectionTrail: '#2E6B8A',
    celebration: '#5B8C5A',
  },
  arcade: {
    boardSurface: { highlightColor: '#00E5FF', highlightOpacity: 0.12, insetColor: '#000000', insetOpacity: 0.16 },
    boardBorderWidth: 2,
    cellDepth: 2,
    pieceShadowOpacity: 0.24,
    glowColor: '#00E5FF',
    glowOpacity: 0.24,
    selectionTrail: '#00E5FF',
    celebration: '#00FF88',
  },
};
