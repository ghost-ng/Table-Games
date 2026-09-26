export type Player = 'player1' | 'player2';
export type LineOrientation = 'horizontal' | 'vertical';
export type Line = { orientation: LineOrientation; row: number; col: number; player: Player | null };
export type Box = { row: number; col: number; owner: Player | null };

export type GameState = {
  horizontalLines: (Player | null)[][]; // 5 rows x 4 cols
  verticalLines: (Player | null)[][]; // 4 rows x 5 cols
  boxes: (Player | null)[][]; // 4 rows x 4 cols
  currentPlayer: Player;
  scores: { player1: number; player2: number };
  isGameOver: boolean;
  winner: Player | 'draw' | null;
  lastMove: { orientation: LineOrientation; row: number; col: number } | null;
};

const DEFAULT_GRID_SIZE = 5;

export function getGridDimensions(state: GameState) {
  const gridRows = state.horizontalLines.length;
  const gridCols = state.verticalLines[0]?.length ?? DEFAULT_GRID_SIZE;
  return { gridRows, gridCols, boxRows: gridRows - 1, boxCols: gridCols - 1 };
}

export function createGame(gridSize: number = DEFAULT_GRID_SIZE): GameState {
  const gridRows = gridSize;
  const gridCols = gridSize;
  const boxRows = gridRows - 1;
  const boxCols = gridCols - 1;

  const horizontalLines: (Player | null)[][] = [];
  for (let r = 0; r < gridRows; r++) {
    horizontalLines.push(new Array(boxCols).fill(null));
  }

  const verticalLines: (Player | null)[][] = [];
  for (let r = 0; r < boxRows; r++) {
    verticalLines.push(new Array(gridCols).fill(null));
  }

  const boxes: (Player | null)[][] = [];
  for (let r = 0; r < boxRows; r++) {
    boxes.push(new Array(boxCols).fill(null));
  }

  return {
    horizontalLines,
    verticalLines,
    boxes,
    currentPlayer: 'player1',
    scores: { player1: 0, player2: 0 },
    isGameOver: false,
    winner: null,
    lastMove: null,
  };
}

export function isLineDrawn(
  state: GameState,
  orientation: LineOrientation,
  row: number,
  col: number
): boolean {
  if (orientation === 'horizontal') {
    return state.horizontalLines[row]?.[col] !== null && state.horizontalLines[row]?.[col] !== undefined;
  }
  return state.verticalLines[row]?.[col] !== null && state.verticalLines[row]?.[col] !== undefined;
}

export function getBoxSideCount(state: GameState, boxRow: number, boxCol: number): number {
  let count = 0;
  // Top horizontal line
  if (state.horizontalLines[boxRow][boxCol] !== null) count++;
  // Bottom horizontal line
  if (state.horizontalLines[boxRow + 1][boxCol] !== null) count++;
  // Left vertical line
  if (state.verticalLines[boxRow][boxCol] !== null) count++;
  // Right vertical line
  if (state.verticalLines[boxRow][boxCol + 1] !== null) count++;
  return count;
}

export function getAvailableLines(
  state: GameState
): { orientation: LineOrientation; row: number; col: number }[] {
  const { gridRows, gridCols, boxRows, boxCols } = getGridDimensions(state);
  const lines: { orientation: LineOrientation; row: number; col: number }[] = [];

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < boxCols; c++) {
      if (state.horizontalLines[r][c] === null) {
        lines.push({ orientation: 'horizontal', row: r, col: c });
      }
    }
  }

  for (let r = 0; r < boxRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (state.verticalLines[r][c] === null) {
        lines.push({ orientation: 'vertical', row: r, col: c });
      }
    }
  }

  return lines;
}

function deepCopy2D<T>(arr: T[][]): T[][] {
  return arr.map((row) => [...row]);
}

export function drawLine(
  state: GameState,
  orientation: LineOrientation,
  row: number,
  col: number
): GameState {
  if (state.isGameOver) return state;
  if (isLineDrawn(state, orientation, row, col)) return state;

  const horizontalLines = deepCopy2D(state.horizontalLines);
  const verticalLines = deepCopy2D(state.verticalLines);
  const boxes = deepCopy2D(state.boxes);
  const scores = { ...state.scores };
  const player = state.currentPlayer;

  // Place the line
  if (orientation === 'horizontal') {
    horizontalLines[row][col] = player;
  } else {
    verticalLines[row][col] = player;
  }

  // Check which boxes this line borders and whether they are now complete
  let boxesCompleted = 0;

  const { boxRows: adjBoxRows, boxCols: adjBoxCols } = getGridDimensions(state);
  const adjacentBoxes = getAdjacentBoxes(orientation, row, col, adjBoxRows, adjBoxCols);

  for (const box of adjacentBoxes) {
    if (boxes[box.row][box.col] === null) {
      // Check all 4 sides of this box using the new line arrays
      const top = horizontalLines[box.row][box.col] !== null;
      const bottom = horizontalLines[box.row + 1][box.col] !== null;
      const left = verticalLines[box.row][box.col] !== null;
      const right = verticalLines[box.row][box.col + 1] !== null;

      if (top && bottom && left && right) {
        boxes[box.row][box.col] = player;
        scores[player]++;
        boxesCompleted++;
      }
    }
  }

  // Check if game is over (all lines drawn)
  const { gridRows, gridCols, boxRows: bRows, boxCols: bCols } = getGridDimensions(state);
  const totalLines = horizontalLines.flat().filter((l) => l !== null).length +
    verticalLines.flat().filter((l) => l !== null).length;
  const maxLines = gridRows * bCols + bRows * gridCols;
  const isGameOver = totalLines === maxLines;

  let winner: Player | 'draw' | null = null;
  if (isGameOver) {
    if (scores.player1 > scores.player2) winner = 'player1';
    else if (scores.player2 > scores.player1) winner = 'player2';
    else winner = 'draw';
  }

  // If boxes were completed, same player goes again; otherwise switch
  const nextPlayer: Player =
    boxesCompleted > 0 ? player : player === 'player1' ? 'player2' : 'player1';

  return {
    horizontalLines,
    verticalLines,
    boxes,
    currentPlayer: isGameOver ? player : nextPlayer,
    scores,
    isGameOver,
    winner,
    lastMove: { orientation, row, col },
  };
}

function getAdjacentBoxes(
  orientation: LineOrientation,
  row: number,
  col: number,
  boxRows: number,
  boxCols: number,
): { row: number; col: number }[] {
  const result: { row: number; col: number }[] = [];

  if (orientation === 'horizontal') {
    if (row < boxRows) {
      result.push({ row, col });
    }
    if (row > 0) {
      result.push({ row: row - 1, col });
    }
  } else {
    if (col < boxCols) {
      result.push({ row, col });
    }
    if (col > 0) {
      result.push({ row, col: col - 1 });
    }
  }

  return result;
}
