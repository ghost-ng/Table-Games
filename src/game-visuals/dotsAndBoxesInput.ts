export type EdgeCandidate = {
  orientation: 'horizontal' | 'vertical';
  row: number;
  col: number;
};

export type DotsAndBoxesGridGeometry = {
  inset: number;
  cellSize: number;
  maxPointerDistance: number;
};

export const SUPPORTED_DOTS_AND_BOXES_GRID_SIZES = [3, 4, 5, 6, 8, 10] as const;

const GRID_INSET_RATIO = 0.08;
const MAX_GRID_INSET = 24;
const MAX_POINTER_DISTANCE_RATIO = 0.055;
const CELL_POINTER_DISTANCE_RATIO = 0.42;
const DISTANCE_EPSILON = 1e-9;

export function getDotsAndBoxesEdgeKey(edge: EdgeCandidate): string {
  return `${edge.orientation}:${edge.row}:${edge.col}`;
}

export function getDotsAndBoxesGridGeometry(
  boardSize: number,
  gridSize: number,
): DotsAndBoxesGridGeometry | null {
  if (!Number.isFinite(boardSize) || boardSize <= 0 || !Number.isInteger(gridSize) || gridSize < 2) {
    return null;
  }

  const inset = Math.min(MAX_GRID_INSET, boardSize * GRID_INSET_RATIO);
  const cellSize = (boardSize - inset * 2) / (gridSize - 1);
  if (!Number.isFinite(cellSize) || cellSize <= 0) return null;

  return {
    inset,
    cellSize,
    maxPointerDistance: Math.min(
      boardSize * MAX_POINTER_DISTANCE_RATIO,
      cellSize * CELL_POINTER_DISTANCE_RATIO,
    ),
  };
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection = segmentLengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point.x - start.x) * segmentX + (point.y - start.y) * segmentY
    ) / segmentLengthSquared));
  const nearestX = start.x + projection * segmentX;
  const nearestY = start.y + projection * segmentY;
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

/**
 * Resolves a board-local pointer coordinate to the nearest open geometric edge.
 * Equal-distance ties are stable: horizontal before vertical, then row and column.
 */
export function resolveNearestOpenEdge(
  point: { x: number; y: number },
  boardSize: number,
  gridSize: number,
  occupied: ReadonlySet<string>,
): EdgeCandidate | null {
  const geometry = getDotsAndBoxesGridGeometry(boardSize, gridSize);
  if (
    !geometry
    || !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
    || point.x < 0
    || point.y < 0
    || point.x > boardSize
    || point.y > boardSize
  ) {
    return null;
  }

  const { inset, cellSize, maxPointerDistance } = geometry;
  let best: EdgeCandidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  const consider = (edge: EdgeCandidate) => {
    if (occupied.has(getDotsAndBoxesEdgeKey(edge))) return;

    const start = {
      x: inset + edge.col * cellSize,
      y: inset + edge.row * cellSize,
    };
    const end = edge.orientation === 'horizontal'
      ? { x: start.x + cellSize, y: start.y }
      : { x: start.x, y: start.y + cellSize };
    const distance = pointToSegmentDistance(point, start, end);
    if (distance <= maxPointerDistance && distance < bestDistance - DISTANCE_EPSILON) {
      best = edge;
      bestDistance = distance;
    }
  };

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize - 1; col += 1) {
      consider({ orientation: 'horizontal', row, col });
    }
  }
  for (let row = 0; row < gridSize - 1; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      consider({ orientation: 'vertical', row, col });
    }
  }

  return best;
}
