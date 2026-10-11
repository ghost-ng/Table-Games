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
  flip: { ...still, duration: 720, rotateFrom: '180deg' },
  roll: { ...still, duration: 640, rotateFrom: '-20deg', scaleFrom: 0.9 },
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

/** Static edge treatments never take part in layout, hit testing, or game state. */
export function getBoardSurfacePresentation(materials: ThemeMaterials) {
  const { boardSurface } = materials;
  const glowing = materials.glowOpacity > 0;
  return {
    overflow: 'visible' as const,
    shadowColor: glowing ? materials.glowColor : '#000000',
    shadowOffset: { width: 0, height: glowing ? 0 : materials.cellDepth },
    shadowOpacity: glowing ? materials.glowOpacity : materials.pieceShadowOpacity,
    shadowRadius: 4,
    elevation: materials.cellDepth,
    highlight: {
      borderTopWidth: materials.boardBorderWidth,
      borderLeftWidth: materials.boardBorderWidth,
      borderTopColor: boardSurface.highlightColor,
      borderLeftColor: boardSurface.highlightColor,
      opacity: boardSurface.highlightOpacity,
    },
    inset: {
      borderBottomWidth: materials.cellDepth,
      borderRightWidth: materials.boardBorderWidth,
      borderBottomColor: boardSurface.insetColor,
      borderRightColor: boardSurface.insetColor,
      opacity: boardSurface.insetOpacity,
    },
  };
}

/** Inset outlines remain visible at clipped rack edges and consume no layout space. */
export function getBoardFocusPresentation(color: string, focusVisible: boolean) {
  return focusVisible ? {
    outlineColor: color,
    outlineStyle: 'solid' as const,
    outlineWidth: 3,
    outlineOffset: -3,
  } : undefined;
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

/** The quarter's transparent padding must not cast a box shadow or colored halo. */
export function getCoinLightingPresentation(_themeName: ThemeName) {
  return {
    shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  };
}

/** Dice keep their original art and code-rendered face, without a square-padding halo. */
export function getDiceLightingPresentation(themeName: ThemeName) {
  return getCoinLightingPresentation(themeName);
}

/** A short ballistic rise/fall followed by one much smaller contact bounce. */
function tossHeight(progress: number) {
  'worklet';
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < 0.72) {
    const flight = progress / 0.72;
    return 4 * flight * (1 - flight);
  }
  return 0.13 * Math.sin(Math.PI * (progress - 0.72) / 0.28);
}

/** Display-only motion: it never selects or changes a coin outcome. */
export function getCoinTossFrame(progress: number, size: number, landsOpposite: boolean, reducedMotion: boolean) {
  'worklet';
  const p = reducedMotion ? 0 : Math.max(0, Math.min(1, progress));
  const spin = Math.min(1, p / 0.72);
  const rotateY = (landsOpposite ? 900 : 720) * (1 - (1 - spin) * (1 - spin));
  const facing = Math.cos(rotateY * Math.PI / 180);
  // Keep the photographed surfaces opaque: crossfading makes the face read as a translucent halo behind the edge.
  const edgeOn = Math.abs(facing) <= 0.2;
  const frontOpacity = !edgeOn && facing > 0 ? 1 : 0;
  const backOpacity = !edgeOn && facing < 0 ? 1 : 0;
  const height = tossHeight(p);
  return {
    translateY: height === 0 ? 0 : -Math.min(28, Math.max(0, size) * 0.1) * height,
    rotateY,
    rotateZ: p === 1 ? 0 : 7 * Math.sin(Math.PI * p) * (1 - p),
    scale: 1 + height * 0.04,
    frontOpacity,
    backOpacity,
    edgeOpacity: edgeOn ? 1 : 0,
  };
}

/** Independent, bounded tumble paths; every die returns to an upright readable face. */
export function getDiceRollFrame(progress: number, size: number, index: number, reducedMotion: boolean) {
  'worklet';
  const p = Math.max(0, Math.min(1, progress));
  if (reducedMotion || p === 0 || p === 1) {
    return { translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1 };
  }
  const direction = index % 2 === 0 ? 1 : -1;
  const spin = Math.min(1, p / 0.72);
  const rotateZ = direction * 360 * (1 - Math.pow(1 - spin, 3));
  const angle = rotateZ * Math.PI / 180;
  const envelope = Math.sin(Math.PI * p);
  const height = tossHeight(p);
  // Keep rotated transparent canvases inside their existing grid allocation.
  const scale = (1 - height * 0.06) / (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
  return {
    translateX: direction * Math.min(5, Math.max(0, size) * 0.025) * envelope,
    translateY: -Math.min(12, Math.max(0, size) * 0.08) * height,
    rotateX: 28 * envelope * Math.cos(p * Math.PI * 4 + index * 0.8),
    rotateY: 22 * envelope * Math.sin(p * Math.PI * 3 + index * 0.4),
    rotateZ,
    scale,
  };
}

/** Reserve a real side gutter so Mancala counts never cover the stone sprites. */
export function getMancalaLayoutPresentation(unit: number) {
  const safeUnit = Math.max(0, unit);
  return {
    pitDiameter: safeUnit * 0.68,
    pitInset: safeUnit * 0.04,
    countGutter: safeUnit * 0.24,
    gutterGap: safeUnit * 0.04,
    stoneSize: Math.max(8, safeUnit * 0.26),
    countFontSize: Math.max(11, Math.round(safeUnit * 0.22)),
  };
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
