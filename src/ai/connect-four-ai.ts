import {
  type GameState,
  type Board,
  type Player,
  getAvailableColumns,
  getLowestEmptyRow,
  checkWinner,
} from '../engines/connect-four';

const ROWS = 6;
const COLS = 7;


function countWindow(
  board: Board,
  player: Player,
  row: number,
  col: number,
  dr: number,
  dc: number
): { playerCount: number; emptyCount: number } {
  let playerCount = 0;
  let emptyCount = 0;

  for (let i = 0; i < 4; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) {
      return { playerCount: 0, emptyCount: 0 };
    }
    const cell = board[r][c];
    if (cell === player) {
      playerCount++;
    } else if (cell === null) {
      emptyCount++;
    }
  }

  return { playerCount, emptyCount };
}

function evaluateBoard(board: Board, aiPlayer: Player): number {
  const opponent: Player = aiPlayer === 'red' ? 'yellow' : 'red';
  let score = 0;

  // Center column preference
  const centerCol = Math.floor(COLS / 2);
  for (let row = 0; row < ROWS; row++) {
    if (board[row][centerCol] === aiPlayer) {
      score += 3;
    }
  }

  // Evaluate all windows of 4
  const directions: [number, number][] = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of directions) {
        // AI windows
        const ai = countWindow(board, aiPlayer, row, col, dr, dc);
        if (ai.playerCount + ai.emptyCount === 4) {
          if (ai.playerCount === 4) {
            score += 100000;
          } else if (ai.playerCount === 3 && ai.emptyCount === 1) {
            score += 50;
          } else if (ai.playerCount === 2 && ai.emptyCount === 2) {
            score += 5;
          }
        }

        // Opponent windows
        const opp = countWindow(board, opponent, row, col, dr, dc);
        if (opp.playerCount + opp.emptyCount === 4) {
          if (opp.playerCount === 4) {
            score -= 100000;
          } else if (opp.playerCount === 3 && opp.emptyCount === 1) {
            score -= 80;
          } else if (opp.playerCount === 2 && opp.emptyCount === 2) {
            score -= 3;
          }
        }
      }
    }
  }

  return score;
}

function simulateDrop(board: Board, col: number, player: Player): Board | null {
  const row = getLowestEmptyRow(board, col);
  if (row === null) return null;
  const newBoard = board.map((r) => [...r]);
  newBoard[row][col] = player;
  return newBoard;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number {
  const { winner } = checkWinner(board);
  if (winner === aiPlayer) return 100000 + depth;
  if (winner !== null && winner !== 'draw') return -(100000 + depth);
  if (winner === 'draw') return 0;
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  const available = getAvailableColumns(board);
  if (available.length === 0) return 0;

  const currentPlayer: Player = isMaximizing
    ? aiPlayer
    : aiPlayer === 'red'
      ? 'yellow'
      : 'red';

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const col of available) {
      const newBoard = simulateDrop(board, col, currentPlayer);
      if (!newBoard) continue;
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const col of available) {
      const newBoard = simulateDrop(board, col, currentPlayer);
      if (!newBoard) continue;
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getAIMove(state: GameState, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): number {
  const aiPlayer = state.currentPlayer;
  const available = getAvailableColumns(state.board);

  if (available.length === 0) return -1;

  let depth: number;
  let randomChance: number;
  switch (difficulty) {
    case 'easy':
      depth = 2;
      randomChance = 0.5;
      break;
    case 'medium':
      depth = 4;
      randomChance = 0.2;
      break;
    case 'hard':
      depth = 6;
      randomChance = 0;
      break;
  }

  // On the very first move (empty board), pick center-ish with slight randomization
  const totalPieces = state.board.flat().filter((c) => c !== null).length;
  if (totalPieces === 0) {
    const centerOptions = [2, 3, 4];
    return centerOptions[Math.floor(Math.random() * centerOptions.length)];
  }

  // Random move chance based on difficulty
  if (Math.random() < randomChance) {
    return available[Math.floor(Math.random() * available.length)];
  }

  let bestScore = -Infinity;
  let bestCols: number[] = [];

  for (const col of available) {
    const newBoard = simulateDrop(state.board, col, aiPlayer);
    if (!newBoard) continue;

    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiPlayer);

    if (score > bestScore) {
      bestScore = score;
      bestCols = [col];
    } else if (score === bestScore) {
      bestCols.push(col);
    }
  }

  // Slight randomization among equally scored moves
  return bestCols[Math.floor(Math.random() * bestCols.length)];
}
