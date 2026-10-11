import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNearestOpenEdge, SUPPORTED_DOTS_AND_BOXES_GRID_SIZES } from './dotsAndBoxesInput';

test('offers large 8x8 and 10x10 dot grids alongside the existing sizes', () => {
  assert.deepEqual(SUPPORTED_DOTS_AND_BOXES_GRID_SIZES, [3, 4, 5, 6, 8, 10]);
});

test('resolves exact and nearby taps to the same open edge', () => {
  const occupied = new Set<string>();

  assert.deepEqual(
    resolveNearestOpenEdge({ x: 87, y: 24 }, 300, 3, occupied),
    { orientation: 'horizontal', row: 0, col: 0 },
  );
  assert.deepEqual(
    resolveNearestOpenEdge({ x: 87, y: 35 }, 300, 3, occupied),
    { orientation: 'horizontal', row: 0, col: 0 },
  );
});

test('uses a stable horizontal-first, row-first tie rule at intersections', () => {
  const intersection = { x: 150, y: 150 };

  assert.deepEqual(
    resolveNearestOpenEdge(intersection, 300, 3, new Set()),
    { orientation: 'horizontal', row: 1, col: 0 },
  );
  assert.deepEqual(
    resolveNearestOpenEdge(intersection, 300, 3, new Set(['horizontal:1:0'])),
    { orientation: 'horizontal', row: 1, col: 1 },
  );
  assert.deepEqual(
    resolveNearestOpenEdge(
      intersection,
      300,
      3,
      new Set(['horizontal:1:0', 'horizontal:1:1']),
    ),
    { orientation: 'vertical', row: 0, col: 1 },
  );
});

test('does not replay an occupied nearest edge or reach across a box', () => {
  assert.equal(
    resolveNearestOpenEdge(
      { x: 87, y: 24 },
      300,
      3,
      new Set(['horizontal:0:0']),
    ),
    null,
  );
  assert.equal(
    resolveNearestOpenEdge({ x: 44, y: 44 }, 408, 10, new Set()),
    null,
  );
});

test('rejects taps outside the board before resolving an edge', () => {
  const occupied = new Set<string>();
  for (const point of [
    { x: -1, y: 150 },
    { x: 301, y: 150 },
    { x: 150, y: -1 },
    { x: 150, y: 301 },
  ]) {
    assert.equal(resolveNearestOpenEdge(point, 300, 3, occupied), null);
  }
});

test('resolves dense 8x8 and 10x10 grids deterministically', () => {
  const cases = [
    {
      point: { x: 299, y: 224 },
      boardSize: 398,
      gridSize: 8,
      expected: { orientation: 'horizontal' as const, row: 4, col: 5 },
    },
    {
      point: { x: 344, y: 284 },
      boardSize: 408,
      gridSize: 10,
      expected: { orientation: 'vertical' as const, row: 6, col: 8 },
    },
  ];

  for (const fixture of cases) {
    const first = resolveNearestOpenEdge(
      fixture.point,
      fixture.boardSize,
      fixture.gridSize,
      new Set(),
    );
    const second = resolveNearestOpenEdge(
      fixture.point,
      fixture.boardSize,
      fixture.gridSize,
      new Set(),
    );
    assert.deepEqual(first, fixture.expected);
    assert.deepEqual(second, fixture.expected);
  }
});

test('rejects invalid board geometry', () => {
  assert.equal(resolveNearestOpenEdge({ x: 0, y: 0 }, 0, 3, new Set()), null);
  assert.equal(resolveNearestOpenEdge({ x: 0, y: 0 }, 300, 1, new Set()), null);
});
