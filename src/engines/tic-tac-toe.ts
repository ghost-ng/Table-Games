export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = Cell[][];

export type GameState = {
  board: Board;
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  winningLine: [number, number][] | null;
  isGameOver: boolean;
};

export function createGame(): GameState {
  const board: Board = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  return {
    board,
    currentPlayer: 'X',
    winner: null,
    winningLine: null,
    isGameOver: false,
  };
}

export function checkWinner(board: Board): {
  winner: Player | 'draw' | null;
  line: [number, number][] | null;
} {
  const lines: [number, number][][] = [
    // Rows
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    // Columns
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    // Diagonals
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]],
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    const cellA = board[a[0]][a[1]];
    const cellB = board[b[0]][b[1]];
    const cellC = board[c[0]][c[1]];
    if (cellA && cellA === cellB && cellA === cellC) {
      return { winner: cellA, line };
    }
  }

  // Check for draw: no empty cells left
  const hasEmpty = board.some((row) => row.some((cell) => cell === null));
  if (!hasEmpty) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

export function getAvailableMoves(board: Board): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === null) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

export function makeMove(
  state: GameState,
  row: number,
  col: number
): GameState {
  if (state.isGameOver) return state;
  if (state.board[row][col] !== null) return state;

  const newBoard: Board = state.board.map((r) => [...r]);
  newBoard[row][col] = state.currentPlayer;

  const { winner, line } = checkWinner(newBoard);
  const isGameOver = winner !== null;
  const nextPlayer: Player = state.currentPlayer === 'X' ? 'O' : 'X';

  return {
    board: newBoard,
    currentPlayer: isGameOver ? state.currentPlayer : nextPlayer,
    winner,
    winningLine: line,
    isGameOver,
  };
}
