import {
  type GameState,
  type Player,
  BOARD_LENGTH,
  getLegalMoves,
  makeMove,
} from '../engines/mancala';

export type Difficulty = 'easy' | 'medium' | 'hard';

// ─── Fast mutable simulation (search only) ──────────────────────────────────
// The engine is immutable and returns rich move info; the search needs to play
// hundreds of thousands of moves, so it uses a stripped-down copy of the rules on
// plain arrays. Side 0 = player1 (pits 0–5, store 6), side 1 = player2 (7–12, 13).

const STORES = [6, 13];
const WIN_SCORE = 1000;

function sideEmpty(b: number[], side: number): boolean {
  const s = side * 7;
  return b[s] + b[s + 1] + b[s + 2] + b[s + 3] + b[s + 4] + b[s + 5] === 0;
}

/**
 * Plays `pit` for `side` on `b` in place. Returns the side to move next,
 * or -1 if the game ended (remaining seeds already swept into the stores).
 */
function play(b: number[], side: number, pit: number): number {
  const ownStore = STORES[side];
  const oppStore = STORES[1 - side];
  let seeds = b[pit];
  b[pit] = 0;
  let idx = pit;
  while (seeds > 0) {
    idx++;
    if (idx === BOARD_LENGTH) idx = 0;
    if (idx === oppStore) continue;
    b[idx]++;
    seeds--;
  }
  const lo = side * 7;
  if (idx >= lo && idx < lo + 6 && b[idx] === 1) {
    const opp = 12 - idx;
    if (b[opp] > 0) {
      b[ownStore] += b[opp] + 1;
      b[opp] = 0;
      b[idx] = 0;
    }
  }
  if (sideEmpty(b, 0) || sideEmpty(b, 1)) {
    for (let i = 0; i < 6; i++) {
      b[6] += b[i];
      b[i] = 0;
      b[13] += b[i + 7];
      b[i + 7] = 0;
    }
    return -1;
  }
  return idx === ownStore ? side : 1 - side;
}

/** Evaluation from `side`'s perspective. */
function evaluate(b: number[], side: number, over: boolean): number {
  const mine = b[STORES[side]];
  const theirs = b[STORES[1 - side]];
  if (over) {
    return mine > theirs ? WIN_SCORE + mine - theirs : mine < theirs ? -WIN_SCORE + mine - theirs : 0;
  }
  // A store holding more than half the seeds has already won.
  if (mine > 24) return WIN_SCORE + mine - theirs;
  if (theirs > 24) return -WIN_SCORE + mine - theirs;
  let mySide = 0;
  let theirSide = 0;
  const lo = side * 7;
  const olo = (1 - side) * 7;
  for (let i = 0; i < 6; i++) {
    mySide += b[lo + i];
    theirSide += b[olo + i];
  }
  // Store difference dominates; seeds on your own side are a mild asset.
  return (mine - theirs) + 0.25 * (mySide - theirSide);
}

function movesFor(b: number[], side: number): number[] {
  const lo = side * 7;
  const out: number[] = [];
  // Try pits nearest the store first — they most often give extra turns/captures,
  // which makes alpha-beta cut off earlier.
  for (let i = 5; i >= 0; i--) if (b[lo + i] > 0) out.push(lo + i);
  // Extra-turn moves (exact distance to store) to the front.
  out.sort((x, y) => {
    const ex = b[x] === STORES[side] - x ? 1 : 0;
    const ey = b[y] === STORES[side] - y ? 1 : 0;
    return ey - ex;
  });
  return out;
}

let nodeBudget = 0;

/**
 * Negamax-style alpha-beta, but extra turns keep the same side to move, so the
 * sign flips only when the side actually changes. Depth counts plies (moves).
 */
function search(b: number[], side: number, depth: number, alpha: number, beta: number, prune: boolean): number {
  nodeBudget--;
  if (depth === 0 || nodeBudget <= 0) return evaluate(b, side, false);
  const moves = movesFor(b, side);
  let best = -Infinity;
  for (const m of moves) {
    const nb = b.slice();
    const next = play(nb, side, m);
    let score: number;
    if (next === -1) score = evaluate(nb, side, true);
    else if (next === side) score = search(nb, side, depth - 1, alpha, beta, prune);
    else score = -search(nb, next, depth - 1, -beta, -alpha, prune);
    if (score > best) best = score;
    if (prune) {
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
  }
  return best;
}

function bestMove(state: GameState, depth: number, prune: boolean): number {
  const side = state.currentPlayer === 'player1' ? 0 : 1;
  const b = state.pits.slice();
  const moves = movesFor(b, side);
  // Safety net so a pathological position can never freeze the UI.
  nodeBudget = 2_000_000;
  let best = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const m of moves) {
    const nb = b.slice();
    const next = play(nb, side, m);
    let score: number;
    if (next === -1) score = evaluate(nb, side, true);
    else if (next === side) score = search(nb, side, depth - 1, alpha, Infinity, prune);
    else score = -search(nb, next, depth - 1, -Infinity, prune ? -alpha : Infinity, prune);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    if (prune && bestScore > alpha) alpha = bestScore;
  }
  return best;
}

function greedyMove(state: GameState): number {
  const me: Player = state.currentPlayer;
  const moves = getLegalMoves(state);
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const r = makeMove(state, m);
    if (!r) continue;
    const store = me === 'player1' ? 6 : 13;
    let score = r.state.pits[store] - state.pits[store];
    if (r.extraTurn) score += 2;
    score += Math.random() * 0.5; // break ties unpredictably
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** Returns the pit index the AI plays for `state.currentPlayer`, or -1 if none. */
export function getAIMove(state: GameState, difficulty: Difficulty): number {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return -1;
  if (moves.length === 1) return moves[0];

  switch (difficulty) {
    case 'easy':
      // Mostly random, sometimes grabs the obvious gain.
      return Math.random() < 0.6 ? moves[Math.floor(Math.random() * moves.length)] : greedyMove(state);
    case 'medium':
      return bestMove(state, 4, false);
    case 'hard':
    default:
      return bestMove(state, 8, true);
  }
}
