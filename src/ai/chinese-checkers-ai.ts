import {
  DIST_TO_GOAL,
  getAllMoves,
  hasWon,
  opponent,
  type Cell,
  type GameState,
  type Move,
  type Player,
} from '../engines/chinese-checkers';

export type Difficulty = 'easy' | 'medium' | 'hard';

const WIN_SCORE = 100000;
/** How many of our best 1-ply moves the hard AI examines at depth 2. */
const HARD_CANDIDATES = 16;

/**
 * Progress score for one player (higher is better): minus the summed distance of every
 * peg to the far apex of its target, minus a penalty for stragglers that lag well
 * behind the pack (they'd otherwise be abandoned and cost many moves at the end).
 */
function playerScore(board: readonly Cell[], player: Player): number {
  const dist = DIST_TO_GOAL[player];
  let sum = 0;
  let max = 0;
  let n = 0;
  const ds: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== player) continue;
    const d = dist[i];
    sum += d;
    if (d > max) max = d;
    ds.push(d);
    n++;
  }
  const avg = n ? sum / n : 0;
  let straggler = 0;
  for (const d of ds) {
    const lag = d - avg - 3;
    if (lag > 0) straggler += lag * lag * 0.5;
  }
  return -sum - straggler;
}

/** Position value from `player`'s point of view. */
export function evaluate(board: readonly Cell[], player: Player): number {
  if (hasWon(board, player)) return WIN_SCORE;
  if (hasWon(board, opponent(player))) return -WIN_SCORE;
  return playerScore(board, player) - playerScore(board, opponent(player));
}

function applyToBoard(board: readonly Cell[], move: Move): Cell[] {
  const next = board.slice();
  next[move.to] = next[move.from];
  next[move.from] = null;
  return next;
}

function forwardGain(move: Move, player: Player): number {
  const dist = DIST_TO_GOAL[player];
  return dist[move.from] - dist[move.to];
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Best moves by score, with random tie-breaking among (near-)equal scores. */
function pickBest(scored: { move: Move; score: number }[]): Move {
  let best = -Infinity;
  for (const s of scored) if (s.score > best) best = s.score;
  return pickRandom(scored.filter((s) => s.score >= best - 1e-6)).move;
}

function scoreOnePly(state: GameState, moves: Move[], me: Player) {
  return moves.map((move) => {
    // Small bonus for forward distance keeps greedy play from shuffling sideways
    // when the evaluation is flat; the straggler penalty still dominates.
    const score = evaluate(applyToBoard(state.board, move), me) + forwardGain(move, me) * 0.01;
    return { move, score };
  });
}

/**
 * Chooses the AI's move for the current player.
 * - easy: mostly a random forward move (occasionally the greedy one)
 * - medium: greedy 1-ply on the progress evaluation
 * - hard: 2-ply (assumes the opponent's best reply), with moves ordered by 1-ply score
 * Returns null only if the current player has no legal move.
 */
export function getAIMove(state: GameState, difficulty: Difficulty): Move | null {
  if (state.isGameOver) return null;
  const me = state.currentPlayer;
  const moves = getAllMoves(state, me);
  if (moves.length === 0) return null;

  // Always take an immediate win.
  for (const m of moves) {
    if (hasWon(applyToBoard(state.board, m), me)) return m;
  }

  if (difficulty === 'easy') {
    if (Math.random() < 0.25) return pickBest(scoreOnePly(state, moves, me));
    const forward = moves.filter((m) => forwardGain(m, me) > 0);
    if (forward.length > 0) return pickRandom(forward);
    return pickBest(scoreOnePly(state, moves, me));
  }

  const scored = scoreOnePly(state, moves, me);
  if (difficulty === 'medium') return pickBest(scored);

  // Hard: 2-ply minimax over the most promising candidates.
  const opp = opponent(me);
  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, HARD_CANDIDATES);
  const results: { move: Move; score: number }[] = [];
  let bestSoFar = -Infinity;

  for (const { move } of candidates) {
    const board = applyToBoard(state.board, move);
    const bias = forwardGain(move, me) * 0.01;
    const replies = getAllMoves({ board }, opp);
    let worst = Infinity;
    if (replies.length === 0) {
      worst = evaluate(board, me);
    } else {
      // Order replies by the opponent's forward gain so strong replies are seen first
      // and the cut-off below triggers early.
      replies.sort((a, b) => forwardGain(b, opp) - forwardGain(a, opp));
      for (const reply of replies) {
        const v = evaluate(applyToBoard(board, reply), me);
        if (v < worst) worst = v;
        if (worst + bias < bestSoFar) break; // already worse than a move we found
      }
    }
    const score = worst + bias;
    if (score > bestSoFar) bestSoFar = score;
    results.push({ move, score });
  }
  return pickBest(results);
}
