import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THEME_MATERIALS } from '../theme/materials';
import {
  getMotionPreset,
  getDropMotion,
  getStateMarker,
  getCellPresentation,
  getPiecePresentation,
  getCheckerPiecePresentation,
  getCoinLightingPresentation,
  getMancalaLayoutPresentation,
  getSelectionTrailPresentation,
  getVictoryPresentation,
  type PieceMotionKind,
} from './presentation';

const motionKinds: PieceMotionKind[] = ['press', 'place', 'drop', 'sow', 'flip', 'roll', 'victory'];

test('reduced motion makes every transition immediate and removes movement', () => {
  for (const kind of motionKinds) {
    assert.deepEqual(getMotionPreset(kind, true), {
      duration: 0, scaleFrom: 1, translateYFrom: 0, rotateFrom: '0deg', opacityFrom: 1,
    });
  }
});

test('motion durations stay within approved press and action ranges', () => {
  const press = getMotionPreset('press', false);
  assert.ok(press.duration >= 80 && press.duration <= 140);
  for (const kind of ['place', 'drop', 'sow', 'flip', 'roll'] as const) {
    const preset = getMotionPreset(kind, false);
    assert.ok(preset.duration >= 180 && preset.duration <= 450, kind);
  }
  assert.ok(getMotionPreset('victory', false).duration <= 450);
  assert.ok(getMotionPreset('drop', false).translateYFrom < 0);
  assert.notEqual(getMotionPreset('flip', false).rotateFrom, '0deg');
});

test('semantic states expose a shape or symbol independently of color', () => {
  assert.deepEqual(getStateMarker('selected'), { shape: 'outline', glyph: null, borderWidth: 3, victory: false });
  assert.deepEqual(getStateMarker('legal'), { shape: 'dot', glyph: '•', borderWidth: 1, victory: false });
  assert.deepEqual(getStateMarker('winning'), { shape: 'star', glyph: '★', borderWidth: 3, victory: true });
  assert.deepEqual(getStateMarker('king'), { shape: 'crown', glyph: '♛', borderWidth: 2, victory: false });
  assert.deepEqual(getStateMarker('found'), { shape: 'check', glyph: '✓', borderWidth: 2, victory: false });
});

test('neutral presentation never reports a victory marker', () => {
  assert.deepEqual(getStateMarker('neutral'), { shape: 'none', glyph: null, borderWidth: 1, victory: false });
  assert.equal(getPiecePresentation('neutral', false, false).marker.victory, false);
  assert.equal(getVictoryPresentation(false, 'crown'), null);
});

test('theme materials keep glow controlled and reuse approved signal colors', () => {
  assert.equal(THEME_MATERIALS.modern.glowOpacity, 0);
  assert.equal(THEME_MATERIALS.retro.glowOpacity, 0);
  assert.ok(THEME_MATERIALS.arcade.glowOpacity > 0 && THEME_MATERIALS.arcade.glowOpacity <= 0.28);
  assert.equal(THEME_MATERIALS.modern.selectionTrail, '#1A56DB');
  assert.equal(THEME_MATERIALS.retro.selectionTrail, '#2E6B8A');
  assert.equal(THEME_MATERIALS.arcade.selectionTrail, '#00E5FF');
  for (const material of Object.values(THEME_MATERIALS)) {
    assert.ok(material.boardBorderWidth > 0);
    assert.ok(material.cellDepth > 0);
    assert.ok(material.pieceShadowOpacity >= 0 && material.pieceShadowOpacity <= 1);
  }
});

const colors = {
  border: '#E5E7EB', focus: '#1A56DB', success: '#059669',
  surfaceRaised: '#FFFFFF', surfaceSunken: '#F3F4F6',
};

test('cell selections remain outlined while press changes depth', () => {
  const raised = getCellPresentation(colors, THEME_MATERIALS.modern, 'selected', false);
  assert.equal(raised.borderWidth, 3);
  assert.equal(raised.borderColor, '#1A56DB');
  assert.equal(raised.backgroundColor, '#FFFFFF');
  assert.equal(raised.translateY, 0);
  const pressed = getCellPresentation(colors, THEME_MATERIALS.modern, 'selected', true);
  assert.equal(pressed.backgroundColor, '#F3F4F6');
  assert.equal(pressed.translateY, 2);
  assert.equal(pressed.borderWidth, 3);
  assert.equal(getCellPresentation(colors, THEME_MATERIALS.modern, 'winning', false).marker.glyph, '★');
});

test('disabled cells keep their raised depth even if their parent reports pressed', () => {
  const cell = getCellPresentation(colors, THEME_MATERIALS.modern, 'selected', true, true);
  assert.equal(cell.translateY, 0);
  assert.equal(cell.backgroundColor, '#FFFFFF');
  assert.equal(cell.shadowOpacity, 0.1);
  assert.equal(cell.elevation, 2);
  assert.equal(cell.opacity, 0.45);
});

test('piece disabled and pressed treatments preserve semantic markers', () => {
  assert.deepEqual(getPiecePresentation('king', true, true), {
    opacity: 0.45, scale: 1, marker: { shape: 'crown', glyph: '♛', borderWidth: 2, victory: false },
  });
  assert.equal(getPiecePresentation('selected', true, false).scale, 0.96);
  assert.equal(getPiecePresentation('neutral', false, false).opacity, 1);
});

test('checker sprites stay complete while selection and king state remain overlay layers', () => {
  for (const cellSize of [32, 48, 80, 120]) {
    const piece = getCheckerPiecePresentation(cellSize);
    assert.ok(piece.pieceSize <= cellSize * 0.8);
    assert.equal(piece.pieceSize, cellSize * 0.78);
    assert.equal(piece.spriteOverflow, 'visible');
    assert.equal(piece.selectionLayer, 'overlay');
    assert.equal(piece.kingLayer, 'overlay');
    assert.ok(piece.selectionRingSize > piece.pieceSize);
    assert.ok(piece.crownSize < piece.pieceSize);
  }
});

test('coin themes change only surrounding light while keeping the photographed quarter neutral', () => {
  assert.deepEqual(getCoinLightingPresentation('modern'), {
    shadowColor: '#111827', shadowOpacity: 0.28, shadowRadius: 12, elevation: 8,
  });
  assert.deepEqual(getCoinLightingPresentation('retro'), {
    shadowColor: '#7C3F18', shadowOpacity: 0.34, shadowRadius: 14, elevation: 8,
  });
  assert.deepEqual(getCoinLightingPresentation('arcade'), {
    shadowColor: '#00E5FF', shadowOpacity: 0.46, shadowRadius: 20, elevation: 10,
  });
});

test('mancala reserves a side gutter outside the stone pit for exact counts', () => {
  for (const unit of [48, 72, 120]) {
    const layout = getMancalaLayoutPresentation(unit);
    assert.equal(layout.pitDiameter + layout.pitInset + layout.countGutter + layout.gutterGap, unit);
    assert.ok(layout.stoneSize <= layout.pitDiameter * 0.4);
    assert.ok(layout.countGutter > 0);
    assert.ok(layout.countFontSize >= 11);
  }
});

test('trails derive ordered pixel geometry from normalized points on rectangular boards', () => {
  const trail = getSelectionTrailPresentation([{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.6 }, { x: 0.8, y: 0.6 }], 200, 100, false);
  assert.deepEqual(trail.start, { x: 20, y: 20 });
  assert.deepEqual(trail.end, { x: 160, y: 60 });
  assert.equal(trail.segments.length, 2);
  assert.deepEqual(trail.segments[0], { x: 50, y: 40, length: Math.sqrt(5200), angle: Math.atan2(40, 60) });
  assert.deepEqual(trail.segments[1], { x: 120, y: 60, length: 80, angle: 0 });
  assert.equal(trail.opacity, 0.65);
  assert.equal(trail.foundMarker, null);
});

test('found trails are quieter and empty or unmeasured trails stay hidden', () => {
  const found = getSelectionTrailPresentation([{ x: 0.5, y: 0.5 }], 100, 80, true);
  assert.equal(found.opacity, 0.3);
  assert.equal(found.foundMarker, '✓');
  assert.deepEqual(found.start, { x: 50, y: 40 });
  assert.deepEqual(found.end, { x: 50, y: 40 });
  assert.deepEqual(found.segments, []);
  assert.equal(getSelectionTrailPresentation([], 100, 80, false).start, null);
  assert.equal(getSelectionTrailPresentation([{ x: 0.5, y: 0.5 }], 0, 80, false).start, null);
});

test('victory accents expose a static marker for each visible kind', () => {
  assert.deepEqual(getVictoryPresentation(true, 'spark'), { glyph: '✦', ring: false });
  assert.deepEqual(getVictoryPresentation(true, 'ring'), { glyph: null, ring: true });
  assert.deepEqual(getVictoryPresentation(true, 'crown'), { glyph: '♛', ring: false });
  assert.deepEqual(getVictoryPresentation(true, 'pulse'), { glyph: null, ring: true });
});

test('disc drops begin above the rack for top and bottom destinations at every cell size', () => {
  for (const [row, cellSize, offset] of [[0, 52, -52], [5, 52, -312], [0, 100, -100], [5, 100, -600]]) {
    const motion = getDropMotion(row, cellSize, false);
    assert.equal(motion.translateYFrom, offset);
    assert.equal(motion.duration, 320);
  }
  assert.deepEqual(getDropMotion(5, 100, true), {
    duration: 0, scaleFrom: 1, translateYFrom: 0, rotateFrom: '0deg', opacityFrom: 1,
  });
});
