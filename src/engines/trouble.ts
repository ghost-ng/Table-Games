/**
 * Pop & Race (game id `trouble`; a pop-dome race game) — pure, immutable game logic.
 *
 * Board model
 * - A shared loop track of 28 spaces (absolute positions 0..27, clockwise).
 * - Up to four seats (0 red, 1 blue, 2 green, 3 yellow); seat `s` starts on space `7 * s`.
 * - Every peg is described by its *progress* relative to its owner's start space:
 *     -1        → in the home area
 *     0..27     → on the track, `progress` spaces clockwise from its start space
 *     28..31    → in its private finish lane (slot `progress - 28`, 31 is the innermost)
 *   After a full lap (progress 27 is the space just before its start) a peg turns into
 *   its finish lane instead of passing its start space again.
 */

export const TRACK_LENGTH = 28;
export const LANE_LENGTH = 4;
export const PEGS_PER_PLAYER = 4;
export const SEAT_SPACING = 7;
export const HOME = -1;
/** First progress value inside the finish lane. */
export const LANE_START = TRACK_LENGTH;
/** Innermost finish-lane slot. */
export const MAX_PROGRESS = TRACK_LENGTH + LANE_LENGTH - 1;

export type Seat = 0 | 1 | 2 | 3;

export interface TroublePlayer {
  seat: Seat;
  /** Progress of each of the four pegs (see module docs). */
  pegs: number[];
}

export interface TroubleState {
  players: TroublePlayer[];
  /** Index into `players` of the player whose turn it is. */
  current: number;
  /** Index into `players` of the winner, once someone has all pegs in their lane. */
  winner: number | null;
}

export interface TroubleCapture {
  player: number;
  peg: number;
}

export interface TroubleMove {
  player: number;
  peg: number;
  from: number;
  to: number;
  /** Opponent peg sent home by this move, if any. */
  capture: TroubleCapture | null;
}

/** Seats used for a given player count (2 players sit in opposite corners). */
export function seatsForCount(playerCount: number): Seat[] {
  if (playerCount <= 2) return [0, 2];
  if (playerCount === 3) return [0, 1, 2];
  return [0, 1, 2, 3];
}

export function createGame(playerCount: number): TroubleState {
  const count = Math.max(2, Math.min(4, Math.floor(playerCount)));
  return {
    players: seatsForCount(count).map((seat) => ({
      seat,
      pegs: Array.from({ length: PEGS_PER_PLAYER }, () => HOME),
    })),
    current: 0,
    winner: null,
  };
}

/** Rolls one die. `rng` returns a float in [0, 1) and is injectable for tests. */
export function rollDie(rng: () => number = Math.random): number {
  const value = Math.floor(rng() * 6) + 1;
  return Math.max(1, Math.min(6, value));
}

export function startSpace(seat: Seat): number {
  return seat * SEAT_SPACING;
}

/** Absolute track position (0..27) of a peg, or null if it is at home or in its lane. */
export function trackPosition(seat: Seat, progress: number): number | null {
  if (progress < 0 || progress >= LANE_START) return null;
  return (startSpace(seat) + progress) % TRACK_LENGTH;
}

export function isInLane(progress: number): boolean {
  return progress >= LANE_START;
}

export function pegsFinished(player: TroublePlayer): number {
  return player.pegs.filter(isInLane).length;
}

export function pegsAtHome(player: TroublePlayer): number {
  return player.pegs.filter((p) => p === HOME).length;
}

export function getWinner(state: TroubleState): number | null {
  const idx = state.players.findIndex((p) => p.pegs.every(isInLane));
  return idx === -1 ? null : idx;
}

/** The opponent peg standing on an absolute track position, if any. */
function findOpponentAt(
  state: TroubleState,
  playerIdx: number,
  position: number,
): TroubleCapture | null {
  for (let o = 0; o < state.players.length; o++) {
    if (o === playerIdx) continue;
    const opp = state.players[o];
    for (let q = 0; q < opp.pegs.length; q++) {
      if (trackPosition(opp.seat, opp.pegs[q]) === position) return { player: o, peg: q };
    }
  }
  return null;
}

/** Every legal move for the current player with this roll (home exits are de-duplicated). */
export function getLegalMoves(state: TroubleState, roll: number): TroubleMove[] {
  if (state.winner !== null) return [];
  const playerIdx = state.current;
  const player = state.players[playerIdx];
  const moves: TroubleMove[] = [];
  let homeExitAdded = false;

  for (let peg = 0; peg < player.pegs.length; peg++) {
    const from = player.pegs[peg];
    let to: number;

    if (from === HOME) {
      if (roll !== 6 || homeExitAdded) continue;
      to = 0;
    } else {
      to = from + roll;
      if (to > MAX_PROGRESS) continue; // must land exactly inside the lane
    }

    const others = player.pegs.filter((_, i) => i !== peg);
    // Can't land on your own peg (track, start space or lane slot).
    if (others.includes(to)) continue;
    // Pegs in the finish lane can't jump over each other.
    if (to >= LANE_START && others.some((q) => q >= LANE_START && q > from && q < to)) continue;

    const pos = trackPosition(player.seat, to);
    const capture = pos === null ? null : findOpponentAt(state, playerIdx, pos);

    moves.push({ player: playerIdx, peg, from, to, capture });
    if (from === HOME) homeExitAdded = true;
  }

  return moves;
}

/** Hands the turn on — or keeps it, when a 6 was rolled — without moving. */
export function passTurn(state: TroubleState, roll: number): TroubleState {
  if (state.winner !== null) return state;
  if (roll === 6) return state;
  return { ...state, current: (state.current + 1) % state.players.length };
}

/** Applies a legal move (from `getLegalMoves`) and advances the turn. */
export function applyMove(state: TroubleState, move: TroubleMove, roll: number): TroubleState {
  const players = state.players.map((p, i) => {
    if (i === move.player) {
      const pegs = p.pegs.slice();
      pegs[move.peg] = move.to;
      return { ...p, pegs };
    }
    if (move.capture && i === move.capture.player) {
      const pegs = p.pegs.slice();
      pegs[move.capture.peg] = HOME;
      return { ...p, pegs };
    }
    return p;
  });

  const moved: TroubleState = { ...state, players };
  const winner = getWinner(moved);
  if (winner !== null) return { ...moved, winner, current: winner };
  return passTurn(moved, roll);
}

/** Progress values a moving peg visits, one per space (for space-by-space animation). */
export function movePath(move: TroubleMove): number[] {
  if (move.from === HOME) return [0];
  const path: number[] = [];
  for (let p = move.from + 1; p <= move.to; p++) path.push(p);
  return path;
}

/** True if the current player's only pegs still in play are at home. */
export function allInPlayAtHome(player: TroublePlayer): boolean {
  const unfinished = player.pegs.filter((p) => !isInLane(p));
  return unfinished.length > 0 && unfinished.every((p) => p === HOME);
}
