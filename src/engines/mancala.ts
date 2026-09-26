/**
 * Mancala (Kalah) — 6 pits per side, 4 seeds per pit, 2 players.
 *
 * Board layout (indices into `pits`), sowing runs in increasing index order
 * (counter-clockwise when drawn with player1 along the bottom):
 *
 *        12 11 10  9  8  7          ← player2's pits
 *    13                     6       ← stores (13 = player2, 6 = player1)
 *         0  1  2  3  4  5          ← player1's pits
 */

export type Player = 'player1' | 'player2';

export const PITS_PER_SIDE = 6;
export const SEEDS_PER_PIT = 4;
export const BOARD_LENGTH = 14;
export const TOTAL_SEEDS = PITS_PER_SIDE * 2 * SEEDS_PER_PIT;
export const STORE: Record<Player, number> = { player1: 6, player2: 13 };

export interface GameState {
  /** 14 entries: 0–5 player1 pits, 6 player1 store, 7–12 player2 pits, 13 player2 store. */
  pits: number[];
  currentPlayer: Player;
  isGameOver: boolean;
  winner: Player | 'draw' | null;
  /** Pit index of the last move played, if any. */
  lastMove: number | null;
}

export interface CaptureInfo {
  /** Pit where the last seed landed. */
  pit: number;
  /** Opposite pit that was emptied. */
  opposite: number;
  /** Total seeds moved to the store (the landing seed plus the opposite pit). */
  seeds: number;
}

export interface MoveResult {
  state: GameState;
  /** Indices where each sown seed landed, in order (length = seeds picked up). */
  path: number[];
  /** True when the last seed landed in the mover's store (and the game continues). */
  extraTurn: boolean;
  capture: CaptureInfo | null;
  /** Seeds each player swept into their store because the game ended; null if not over. */
  sweep: { player1: number; player2: number } | null;
}

export function createGame(): GameState {
  const pits = new Array(BOARD_LENGTH).fill(SEEDS_PER_PIT);
  pits[STORE.player1] = 0;
  pits[STORE.player2] = 0;
  return {
    pits,
    currentPlayer: 'player1',
    isGameOver: false,
    winner: null,
    lastMove: null,
  };
}

export function otherPlayer(p: Player): Player {
  return p === 'player1' ? 'player2' : 'player1';
}

/** Pit indices (not stores) owned by a player, in sowing order. */
export function pitsOf(player: Player): number[] {
  const start = player === 'player1' ? 0 : 7;
  return [start, start + 1, start + 2, start + 3, start + 4, start + 5];
}

export function ownerOf(index: number): Player {
  return index <= 6 ? 'player1' : 'player2';
}

export function isStore(index: number): boolean {
  return index === 6 || index === 13;
}

/** The pit directly across the board. */
export function oppositePit(index: number): number {
  return 12 - index;
}

export function isLegalMove(state: GameState, pit: number): boolean {
  if (state.isGameOver) return false;
  if (!Number.isInteger(pit) || isStore(pit) || pit < 0 || pit >= BOARD_LENGTH) return false;
  if (ownerOf(pit) !== state.currentPlayer) return false;
  return state.pits[pit] > 0;
}

export function getLegalMoves(state: GameState): number[] {
  if (state.isGameOver) return [];
  return pitsOf(state.currentPlayer).filter((i) => state.pits[i] > 0);
}

export function getScore(state: GameState): { player1: number; player2: number } {
  return { player1: state.pits[STORE.player1], player2: state.pits[STORE.player2] };
}

function sideEmpty(pits: number[], player: Player): boolean {
  return pitsOf(player).every((i) => pits[i] === 0);
}

/**
 * Plays `pit` for the current player. Returns the new state plus what happened, or
 * `null` if the move is illegal. The input state is never mutated.
 */
export function makeMove(state: GameState, pit: number): MoveResult | null {
  if (!isLegalMove(state, pit)) return null;

  const mover = state.currentPlayer;
  const opponentStore = STORE[otherPlayer(mover)];
  const ownStore = STORE[mover];
  const pits = state.pits.slice();

  let seeds = pits[pit];
  pits[pit] = 0;
  const path: number[] = [];
  let idx = pit;
  while (seeds > 0) {
    idx = (idx + 1) % BOARD_LENGTH;
    if (idx === opponentStore) continue;
    pits[idx]++;
    path.push(idx);
    seeds--;
  }

  let capture: CaptureInfo | null = null;
  const last = idx;
  if (!isStore(last) && ownerOf(last) === mover && pits[last] === 1) {
    const opp = oppositePit(last);
    if (pits[opp] > 0) {
      const taken = pits[opp] + 1;
      pits[ownStore] += taken;
      pits[opp] = 0;
      pits[last] = 0;
      capture = { pit: last, opposite: opp, seeds: taken };
    }
  }

  let extraTurn = last === ownStore;
  let sweep: MoveResult['sweep'] = null;
  let isGameOver = false;
  let winner: GameState['winner'] = null;

  if (sideEmpty(pits, 'player1') || sideEmpty(pits, 'player2')) {
    isGameOver = true;
    extraTurn = false;
    sweep = { player1: 0, player2: 0 };
    for (const p of ['player1', 'player2'] as Player[]) {
      for (const i of pitsOf(p)) {
        sweep[p] += pits[i];
        pits[STORE[p]] += pits[i];
        pits[i] = 0;
      }
    }
    const a = pits[STORE.player1];
    const b = pits[STORE.player2];
    winner = a > b ? 'player1' : b > a ? 'player2' : 'draw';
  }

  return {
    state: {
      pits,
      currentPlayer: isGameOver || extraTurn ? mover : otherPlayer(mover),
      isGameOver,
      winner,
      lastMove: pit,
    },
    path,
    extraTurn,
    capture,
    sweep,
  };
}
