import type { ThemeColors, ThemeMaterials, ThemeName } from '../theme/types';

export type PieceMotionKind = 'press' | 'place' | 'drop' | 'sow' | 'flip' | 'roll' | 'victory';
export type VisualCellState = 'neutral' | 'selected' | 'legal' | 'winning' | 'king' | 'found';
export type VictoryAccentKind = 'spark' | 'ring' | 'crown' | 'pulse';

export interface MotionPreset {
  duration: number;
  scaleFrom: number;
  translateYFrom: number;
  rotateFrom: string;
  opacityFrom: number;
}

const still: MotionPreset = { duration: 0, scaleFrom: 1, translateYFrom: 0, rotateFrom: '0deg', opacityFrom: 1 };
const motionPresets: Record<PieceMotionKind, MotionPreset> = {
  press: { ...still, duration: 110, scaleFrom: 0.96 },
  place: { ...still, duration: 220, scaleFrom: 0.88, opacityFrom: 0 },
  drop: { ...still, duration: 320, translateYFrom: -24 },
  sow: { ...still, duration: 260, translateYFrom: -12, scaleFrom: 0.9 },
  flip: { ...still, duration: 320, rotateFrom: '180deg' },
  roll: { ...still, duration: 380, rotateFrom: '-20deg', scaleFrom: 0.9 },
  victory: { ...still, duration: 420, scaleFrom: 0.9, opacityFrom: 0 },
};

export function getMotionPreset(kind: PieceMotionKind, reducedMotion: boolean): MotionPreset {
  return { ...(reducedMotion ? still : motionPresets[kind]) };
}

/** A disc starts one cell above the rack, regardless of its destination row. */
export function getDropMotion(row: number, cellSize: number, reducedMotion: boolean): MotionPreset {
  const motion = getMotionPreset('drop', reducedMotion);
  return { ...motion, translateYFrom: reducedMotion ? 0 : -(row + 1) * cellSize };
}

export interface StateMarker {
  shape: 'none' | 'outline' | 'dot' | 'star' | 'crown' | 'check';
  glyph: string | null;
  borderWidth: number;
  victory: boolean;
}

const stateMarkers: Record<VisualCellState, StateMarker> = {
  neutral: { shape: 'none', glyph: null, borderWidth: 1, victory: false },
  selected: { shape: 'outline', glyph: null, borderWidth: 3, victory: false },
  legal: { shape: 'dot', glyph: '•', borderWidth: 1, victory: false },
  winning: { shape: 'star', glyph: '★', borderWidth: 3, victory: true },
  king: { shape: 'crown', glyph: '♛', borderWidth: 2, victory: false },
  found: { shape: 'check', glyph: '✓', borderWidth: 2, victory: false },
};

export function getStateMarker(state: VisualCellState): StateMarker {
  return { ...stateMarkers[state] };
}

export function getCellPresentation(
  colors: Pick<ThemeColors, 'border' | 'focus' | 'success' | 'surfaceRaised' | 'surfaceSunken'>,
  materials: ThemeMaterials,
  state: VisualCellState,
  pressed: boolean,
  disabled = false,
) {
  const marker = getStateMarker(state);
  const depressed = pressed && !disabled;
  return {
    marker,
    borderWidth: marker.borderWidth,
    borderColor: state === 'selected' || state === 'legal' ? colors.focus
      : state === 'winning' || state === 'found' ? colors.success : colors.border,
    backgroundColor: depressed ? colors.surfaceSunken : colors.surfaceRaised,
    translateY: depressed ? materials.cellDepth : 0,
    opacity: disabled ? 0.45 : 1,
    shadowOpacity: depressed ? 0 : materials.pieceShadowOpacity,
    elevation: depressed ? 0 : materials.cellDepth,
  };
}

export function getPiecePresentation(state: VisualCellState, pressed: boolean, disabled: boolean) {
  return {
    opacity: disabled ? 0.45 : 1,
    scale: pressed && !disabled ? 0.96 : 1,
    marker: getStateMarker(state),
  };
}

/** Keep complete checker artwork separate from code-rendered state overlays. */
export function getCheckerPiecePresentation(cellSize: number) {
  const safeCellSize = Math.max(0, cellSize);
  return {
    pieceSize: safeCellSize * 0.78,
    selectionRingSize: safeCellSize * 0.86,
    crownSize: safeCellSize * 0.43,
    spriteOverflow: 'visible' as const,
    selectionLayer: 'overlay' as const,
    kingLayer: 'overlay' as const,
  };
}

/** Theme personality belongs around the shared natural-silver quarter, never in its bitmap. */
export function getCoinLightingPresentation(themeName: ThemeName) {
  return {
    modern: { shadowColor: '#111827', shadowOpacity: 0.28, shadowRadius: 12, elevation: 8 },
    retro: { shadowColor: '#7C3F18', shadowOpacity: 0.34, shadowRadius: 14, elevation: 8 },
    arcade: { shadowColor: '#00E5FF', shadowOpacity: 0.46, shadowRadius: 20, elevation: 10 },
  }[themeName];
}

export interface NormalizedPoint { x: number; y: number }
export interface TrailSegment { x: number; y: number; length: number; angle: number }

export function getSelectionTrailPresentation(points: readonly NormalizedPoint[], width: number, height: number, found: boolean) {
  const pixels = width > 0 && height > 0 ? points.map(({ x, y }) => ({ x: x * width, y: y * height })) : [];
  const segments: TrailSegment[] = [];
  for (let index = 1; index < pixels.length; index++) {
    const from = pixels[index - 1];
    const to = pixels[index];
    segments.push({
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      length: Math.hypot(to.x - from.x, to.y - from.y),
      angle: Math.atan2(to.y - from.y, to.x - from.x),
    });
  }
  return {
    segments,
    start: pixels[0] ?? null,
    end: pixels[pixels.length - 1] ?? null,
    opacity: found ? 0.3 : 0.65,
    foundMarker: found ? '✓' : null,
  };
}

export function getVictoryPresentation(visible: boolean, kind: VictoryAccentKind) {
  if (!visible) return null;
  return {
    glyph: kind === 'spark' ? '✦' : kind === 'crown' ? '♛' : null,
    ring: kind === 'ring' || kind === 'pulse',
  };
}
