export type Player = 'red' | 'yellow';
export type Cell = Player | null;
export type Board = Cell[][]; // 6 rows x 7 columns
export type GameState = {
  board: Board;
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  winningLine: [number, number][] | null;
  isGameOver: boolean;
  lastMove: [number, number] | null;
};

const ROWS = 6;
const COLS = 7;

export function createGame(): GameState {
  const board: Board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );
  return {
    board,
    currentPlayer: 'red',
    winner: null,
    winningLine: null,
    isGameOver: false,
    lastMove: null,
  };
}

export function getLowestEmptyRow(board: Board, column: number): number | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][column] === null) {
      return row;
    }
  }
  return null;
}

export function getAvailableColumns(board: Board): number[] {
  const columns: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === null) {
      columns.push(col);
    }
  }
  return columns;
}

export function checkWinner(
  board: Board
): { winner: Player | 'draw' | null; line: [number, number][] | null } {
  // Check all directions: horizontal, vertical, diagonal-down-right, diagonal-down-left
  const directions: [number, number][] = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      if (cell === null) continue;

      for (const [dr, dc] of directions) {
        const line: [number, number][] = [[row, col]];
        let valid = true;

        for (let i = 1; i < 4; i++) {
          const nr = row + dr * i;
          const nc = col + dc * i;
          if (
            nr < 0 ||
            nr >= ROWS ||
            nc < 0 ||
            nc >= COLS ||
            board[nr][nc] !== cell
          ) {
            valid = false;
            break;
          }
          line.push([nr, nc]);
        }

        if (valid) {
          return { winner: cell, line };
        }
      }
    }
  }

  // Check for draw - if no empty cells remain
  const isDraw = board[0].every((cell) => cell !== null);
  if (isDraw) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

export function dropPiece(state: GameState, column: number): GameState {
  if (state.isGameOver) return state;
  if (column < 0 || column >= COLS) return state;

  const row = getLowestEmptyRow(state.board, column);
  if (row === null) return state;

  // Clone board
  const newBoard: Board = state.board.map((r) => [...r]);
  newBoard[row][column] = state.currentPlayer;

  const { winner, line } = checkWinner(newBoard);
  const nextPlayer: Player = state.currentPlayer === 'red' ? 'yellow' : 'red';

  return {
    board: newBoard,
    currentPlayer: winner ? state.currentPlayer : nextPlayer,
    winner,
    winningLine: line,
    isGameOver: winner !== null,
    lastMove: [row, column],
  };
}
