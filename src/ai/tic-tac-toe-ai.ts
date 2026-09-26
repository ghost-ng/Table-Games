import {
  type GameState,
  type Board,
  type Player,
  checkWinner,
  getAvailableMoves,
} from '../engines/tic-tac-toe';

function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  humanPlayer: Player
): number {
  const { winner } = checkWinner(board);

  if (winner === aiPlayer) return 10 - depth;
  if (winner === humanPlayer) return depth - 10;
  if (winner === 'draw') return 0;

  const moves = getAvailableMoves(board);

  if (isMaximizing) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      board[r][c] = aiPlayer;
      const score = minimax(board, depth + 1, false, aiPlayer, humanPlayer);
      board[r][c] = null;
      best = Math.max(best, score);
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      board[r][c] = humanPlayer;
      const score = minimax(board, depth + 1, true, aiPlayer, humanPlayer);
      board[r][c] = null;
      best = Math.min(best, score);
    }
    return best;
  }
}

function getBestMove(state: GameState): [number, number] {
  const aiPlayer = state.currentPlayer;
  const humanPlayer: Player = aiPlayer === 'X' ? 'O' : 'X';
  const board: Board = state.board.map((r) => [...r]);
  const moves = getAvailableMoves(board);

  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const [r, c] of moves) {
    board[r][c] = aiPlayer;
    const score = minimax(board, 0, false, aiPlayer, humanPlayer);
    board[r][c] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  return bestMove;
}

function getRandomGoodMove(state: GameState): [number, number] {
  const aiPlayer = state.currentPlayer;
  const humanPlayer: Player = aiPlayer === 'X' ? 'O' : 'X';
  const board: Board = state.board.map((r) => [...r]);
  const moves = getAvailableMoves(board);

  // Filter out moves that immediately lose (i.e., opponent can win next turn)
  const safeMoves = moves.filter(([r, c]) => {
    board[r][c] = aiPlayer;
    // Check if opponent can win on their next move
    const opponentMoves = getAvailableMoves(board);
    let opponentCanWin = false;
    for (const [or, oc] of opponentMoves) {
      board[or][oc] = humanPlayer;
      const { winner } = checkWinner(board);
      if (winner === humanPlayer) {
        opponentCanWin = true;
      }
      board[or][oc] = null;
    }
    board[r][c] = null;
    return !opponentCanWin;
  });

  const pool = safeMoves.length > 0 ? safeMoves : moves;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getAIMove(state: GameState, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): [number, number] {
  const moves = getAvailableMoves(state.board);
  if (moves.length === 0) {
    throw new Error('No available moves');
  }

  let optimalChance: number;
  switch (difficulty) {
    case 'easy':
      optimalChance = 0.2; // 80% random, 20% optimal
      break;
    case 'medium':
      optimalChance = 0.7; // 30% random, 70% optimal
      break;
    case 'hard':
      optimalChance = 1.0; // 100% optimal (unbeatable)
      break;
  }

  if (Math.random() < optimalChance) {
    return getBestMove(state);
  }
  return getRandomGoodMove(state);
}
