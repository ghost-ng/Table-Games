import {
  type GameState,
  type Board,
  type Player,
  type Position,
  type Move,
  getAllPlayerMoves,
  getJumpMoves,
  hasMandatoryJumps,
  checkGameOver,
} from '../engines/checkers';

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function evaluateBoard(board: Board, aiPlayer: Player): number {
  const opponent: Player = aiPlayer === 'player1' ? 'player2' : 'player1';
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const isAI = piece.player === aiPlayer;
      const sign = isAI ? 1 : -1;

      // Piece value: normal = 1, king = 1.5
      const pieceValue = piece.type === 'king' ? 1.5 : 1.0;
      score += sign * pieceValue * 100;

      // Center position bonus (columns 2-5, rows 2-5)
      const centerColBonus =
        c >= 2 && c <= 5 ? 5 : 0;
      const centerRowBonus =
        r >= 2 && r <= 5 ? 5 : 0;
      score += sign * (centerColBonus + centerRowBonus);

      // Advancement bonus for normal pieces (closer to promotion)
      if (piece.type === 'normal') {
        const advancement =
          piece.player === 'player1' ? 7 - r : r;
        score += sign * advancement * 3;
      }

      // Back row bonus (protecting home row)
      if (piece.type === 'normal') {
        if (
          (piece.player === 'player1' && r === 7) ||
          (piece.player === 'player2' && r === 0)
        ) {
          score += sign * 4;
        }
      }
    }
  }

  // Mobility bonus
  const aiMoves = getAllPlayerMoves(board, aiPlayer);
  const oppMoves = getAllPlayerMoves(board, opponent);
  const aiMobility = aiMoves.reduce((sum, pm) => sum + pm.moves.length, 0);
  const oppMobility = oppMoves.reduce((sum, pm) => sum + pm.moves.length, 0);
  score += (aiMobility - oppMobility) * 2;

  return score;
}

function applyMove(board: Board, move: Move, player: Player): Board {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from.row][move.from.col]!;

  newBoard[move.to.row][move.to.col] = { ...piece };
  newBoard[move.from.row][move.from.col] = null;

  if (move.captured) {
    newBoard[move.captured.row][move.captured.col] = null;
  }

  // Promote
  const movedPiece = newBoard[move.to.row][move.to.col]!;
  if (
    (movedPiece.player === 'player1' && move.to.row === 0) ||
    (movedPiece.player === 'player2' && move.to.row === 7)
  ) {
    movedPiece.type = 'king';
  }

  return newBoard;
}

/**
 * Expand a single move into all possible jump sequences from it.
 * Returns arrays of moves (each array is one complete sequence).
 */
function expandJumpSequences(
  board: Board,
  move: Move,
  player: Player
): Move[][] {
  if (!move.captured) {
    return [[move]];
  }

  const newBoard = applyMove(board, move, player);
  const landedPiece = newBoard[move.to.row][move.to.col]!;
  const furtherJumps = getJumpMoves(
    newBoard,
    move.to,
    player,
    landedPiece.type === 'king'
  );

  if (furtherJumps.length === 0) {
    return [[move]];
  }

  const sequences: Move[][] = [];
  for (const nextJump of furtherJumps) {
    const subSequences = expandJumpSequences(newBoard, nextJump, player);
    for (const sub of subSequences) {
      sequences.push([move, ...sub]);
    }
  }

  return sequences;
}

function applyMoveSequence(board: Board, moves: Move[], player: Player): Board {
  let b = board;
  for (const move of moves) {
    b = applyMove(b, move, player);
  }
  return b;
}

interface ScoredSequence {
  sequence: Move[];
  score: number;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  currentPlayer: Player
): number {
  const winner = checkGameOver(board, currentPlayer);
  if (winner !== null) {
    return winner === aiPlayer ? 10000 + depth : -10000 - depth;
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  const allPieceMoves = getAllPlayerMoves(board, currentPlayer);

  // Collect all complete move sequences
  const allSequences: Move[][] = [];
  for (const pm of allPieceMoves) {
    for (const move of pm.moves) {
      const expanded = expandJumpSequences(board, move, currentPlayer);
      allSequences.push(...expanded);
    }
  }

  if (allSequences.length === 0) {
    // No moves = loss
    return currentPlayer === aiPlayer ? -10000 : 10000;
  }

  const nextPlayer: Player =
    currentPlayer === 'player1' ? 'player2' : 'player1';

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const seq of allSequences) {
      const newBoard = applyMoveSequence(board, seq, currentPlayer);
      const evalScore = minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        false,
        aiPlayer,
        nextPlayer
      );
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const seq of allSequences) {
      const newBoard = applyMoveSequence(board, seq, currentPlayer);
      const evalScore = minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        true,
        aiPlayer,
        nextPlayer
      );
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Returns an array of moves for the AI to execute (supports multi-jump).
 * Each element has { from, to }.
 */
export function getAIMove(
  state: GameState,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): { from: Position; to: Position }[] {
  const aiPlayer = state.currentPlayer;
  const board = state.board;

  let maxDepth: number;
  let randomChance: number;
  switch (difficulty) {
    case 'easy':
      maxDepth = 2;
      randomChance = 0.4;
      break;
    case 'medium':
      maxDepth = 4;
      randomChance = 0;
      break;
    case 'hard':
      maxDepth = 6;
      randomChance = 0;
      break;
  }

  // If in a jump sequence, only get further jumps from the current position
  if (state.jumpSequence) {
    const piece = board[state.jumpSequence.row][state.jumpSequence.col]!;
    const jumps = getJumpMoves(
      board,
      state.jumpSequence,
      aiPlayer,
      piece.type === 'king'
    );

    if (jumps.length === 0) return [];

    // Expand all possible sequences from here
    const sequences: Move[][] = [];
    for (const jump of jumps) {
      const expanded = expandJumpSequences(board, jump, aiPlayer);
      sequences.push(...expanded);
    }

    // Random move on easy difficulty
    if (Math.random() < randomChance && sequences.length > 0) {
      const seq = sequences[Math.floor(Math.random() * sequences.length)];
      return seq.map((m) => ({ from: m.from, to: m.to }));
    }

    // Pick the best sequence
    let bestSeq = sequences[0];
    let bestScore = -Infinity;
    const nextPlayer: Player =
      aiPlayer === 'player1' ? 'player2' : 'player1';

    for (const seq of sequences) {
      const newBoard = applyMoveSequence(board, seq, aiPlayer);
      const score = minimax(
        newBoard,
        maxDepth - 1,
        -Infinity,
        Infinity,
        false,
        aiPlayer,
        nextPlayer
      );
      if (score > bestScore) {
        bestScore = score;
        bestSeq = seq;
      }
    }

    return bestSeq.map((m) => ({ from: m.from, to: m.to }));
  }

  // Normal turn: get all moves for all pieces
  const allPieceMoves = getAllPlayerMoves(board, aiPlayer);
  if (allPieceMoves.length === 0) return [];

  // Expand into full sequences
  const allSequences: Move[][] = [];
  for (const pm of allPieceMoves) {
    for (const move of pm.moves) {
      const expanded = expandJumpSequences(board, move, aiPlayer);
      allSequences.push(...expanded);
    }
  }

  if (allSequences.length === 0) return [];

  // Random move on easy difficulty
  if (Math.random() < randomChance) {
    const seq = allSequences[Math.floor(Math.random() * allSequences.length)];
    return seq.map((m) => ({ from: m.from, to: m.to }));
  }

  // Evaluate each sequence with minimax
  const nextPlayer: Player =
    aiPlayer === 'player1' ? 'player2' : 'player1';
  let bestSeq = allSequences[0];
  let bestScore = -Infinity;

  for (const seq of allSequences) {
    const newBoard = applyMoveSequence(board, seq, aiPlayer);
    const score = minimax(
      newBoard,
      maxDepth - 1,
      -Infinity,
      Infinity,
      false,
      aiPlayer,
      nextPlayer
    );
    if (score > bestScore) {
      bestScore = score;
      bestSeq = seq;
    }
  }

  return bestSeq.map((m) => ({ from: m.from, to: m.to }));
}
