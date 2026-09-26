/**
 * Chinese Checkers (two players) — pure, immutable game logic.
 *
 * Board: the standard 121-hole six-pointed star, described in cube coordinates
 * (x + y + z = 0). A hole belongs to the star if it lies in either of the two big
 * triangles { x, y, z <= 4 } or { x, y, z >= -4 }. Rows are the z coordinate
 * (-8 at the top, 8 at the bottom).
 *
 * player1 starts in the bottom triangle (rows 5..8) and must fill the top one;
 * player2 starts at the top (rows -8..-5) and must fill the bottom one.
 */

export type Player = 'player1' | 'player2';
export type Cell = Player | null;
export type Outcome = Player | 'draw';

export interface Hole {
  index: number;
  /** Cube coordinates (x + y + z = 0). Axial coordinates are q = x, r = z. */
  x: number;
  y: number;
  z: number;
  /** Row, -8 (top) .. 8 (bottom). Same as z. */
  row: number;
  /**
   * Pixel-independent layout coordinates in units of the hole spacing, with the star's
   * centre hole at (0, 0). `lx` spans -6..6 and `ly` spans -8·√3/2 .. 8·√3/2.
   */
  lx: number;
  ly: number;
  /** Indices of the (up to six) adjacent holes. */
  neighbors: number[];
  /**
   * For each of the six directions: the adjacent hole and the hole directly beyond it
   * (or -1 when off the board). Used for hop generation.
   */
  jumps: { over: number; to: number }[];
}

export interface Move {
  from: number;
  to: number;
  /** Holes visited in order, including `from` and `to`. Length 2 for a step. */
  path: number[];
  isHop: boolean;
}

export interface GameState {
  /** Occupant of each hole, indexed like `HOLES`. */
  board: Cell[];
  currentPlayer: Player;
  /** Total moves made by both players. */
  moveCount: number;
  lastMove: (Move & { player: Player }) | null;
  winner: Outcome | null;
  isGameOver: boolean;
  /** True when the game ended because MOVE_LIMIT was reached. */
  endedByMoveLimit: boolean;
}

export const PEGS_PER_PLAYER = 10;
/** Safety cap on total moves; the player with more pegs home then wins. */
export const MOVE_LIMIT = 300;
/** Star extent in hole-spacing units: 13 holes wide, 17 rows spaced √3/2 apart. */
export const ROW_SPACING = Math.sqrt(3) / 2;
export const BOARD_COLUMNS = 13;
export const BOARD_ROWS = 17;
/**
 * Height ÷ width of the star's bounding box when each hole gets a full cell
 * (half a spacing of padding on every side): (16·√3/2 + 1) / 13 ≈ 1.1428.
 */
export const BOARD_ASPECT_RATIO = (16 * ROW_SPACING + 1) / BOARD_COLUMNS;

const DIRECTIONS: [number, number, number][] = [
  [1, -1, 0],
  [1, 0, -1],
  [0, 1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [0, -1, 1],
];

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

function inStar(x: number, y: number, z: number): boolean {
  return (x <= 4 && y <= 4 && z <= 4) || (x >= -4 && y >= -4 && z >= -4);
}

function buildHoles(): { holes: Hole[]; lookup: Map<string, number> } {
  const holes: Hole[] = [];
  const lookup = new Map<string, number>();
  for (let z = -8; z <= 8; z++) {
    for (let x = -8; x <= 8; x++) {
      const y = -x - z;
      if (y < -8 || y > 8 || !inStar(x, y, z)) continue;
      const index = holes.length;
      holes.push({
        index,
        x,
        y,
        z,
        row: z,
        lx: x + z / 2,
        ly: z * ROW_SPACING,
        neighbors: [],
        jumps: [],
      });
      lookup.set(key(x, y, z), index);
    }
  }
  for (const h of holes) {
    for (const [dx, dy, dz] of DIRECTIONS) {
      const over = lookup.get(key(h.x + dx, h.y + dy, h.z + dz));
      const to = lookup.get(key(h.x + 2 * dx, h.y + 2 * dy, h.z + 2 * dz));
      if (over !== undefined) h.neighbors.push(over);
      h.jumps.push({ over: over ?? -1, to: over !== undefined && to !== undefined ? to : -1 });
    }
  }
  return { holes, lookup };
}

const built = buildHoles();
export const HOLES: readonly Hole[] = built.holes;
const LOOKUP = built.lookup;

/** Hole index at cube coordinates, or -1. */
export function holeAt(x: number, y: number, z: number): number {
  return LOOKUP.get(key(x, y, z)) ?? -1;
}

/** Hex distance between two holes. */
export function hexDistance(a: number, b: number): number {
  const ha = HOLES[a];
  const hb = HOLES[b];
  return (Math.abs(ha.x - hb.x) + Math.abs(ha.y - hb.y) + Math.abs(ha.z - hb.z)) / 2;
}

/** Starting triangle of each player. */
export const HOME: Record<Player, readonly number[]> = {
  player1: HOLES.filter((h) => h.row >= 5).map((h) => h.index),
  player2: HOLES.filter((h) => h.row <= -5).map((h) => h.index),
};

/** Triangle each player must fill (the opposite point). */
export const TARGET: Record<Player, readonly number[]> = {
  player1: HOME.player2,
  player2: HOME.player1,
};

/** The far apex of each player's target triangle. */
export const TARGET_APEX: Record<Player, number> = {
  player1: holeAt(4, 4, -8),
  player2: holeAt(-4, -4, 8),
};

const TARGET_SET: Record<Player, ReadonlySet<number>> = {
  player1: new Set(TARGET.player1),
  player2: new Set(TARGET.player2),
};

/** Precomputed distance of every hole to each player's target apex. */
export const DIST_TO_GOAL: Record<Player, readonly number[]> = {
  player1: HOLES.map((h) => hexDistance(h.index, TARGET_APEX.player1)),
  player2: HOLES.map((h) => hexDistance(h.index, TARGET_APEX.player2)),
};

export function opponent(p: Player): Player {
  return p === 'player1' ? 'player2' : 'player1';
}

export function isInTarget(player: Player, hole: number): boolean {
  return TARGET_SET[player].has(hole);
}

export function createGame(startingPlayer: Player = 'player1'): GameState {
  const board: Cell[] = HOLES.map(() => null);
  for (const i of HOME.player1) board[i] = 'player1';
  for (const i of HOME.player2) board[i] = 'player2';
  return {
    board,
    currentPlayer: startingPlayer,
    moveCount: 0,
    lastMove: null,
    winner: null,
    isGameOver: false,
    endedByMoveLimit: false,
  };
}

/**
 * All legal moves for the peg at `from` (empty if the hole is empty). Steps go to
 * any empty neighbour; hop chains are explored breadth-first, so each destination
 * carries the shortest hop path to it and no hole is visited twice.
 */
export function getLegalDestinations(state: Pick<GameState, 'board'>, from: number): Move[] {
  const { board } = state;
  if (from < 0 || from >= board.length || board[from] === null) return [];

  const moves: Move[] = [];
  for (const n of HOLES[from].neighbors) {
    if (board[n] === null) moves.push({ from, to: n, path: [from, n], isHop: false });
  }

  // Hop chains. The moving peg has left `from`, so `from` counts as empty but
  // is never a legal destination (it's marked visited up front).
  const parent = new Map<number, number>();
  parent.set(from, -1);
  const queue: number[] = [from];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const { over, to } of HOLES[cur].jumps) {
      if (to < 0 || parent.has(to)) continue;
      if (board[over] === null || over === from) continue;
      if (board[to] !== null) continue;
      parent.set(to, cur);
      queue.push(to);
      const path: number[] = [];
      for (let p = to; p !== -1; p = parent.get(p)!) path.push(p);
      path.reverse();
      moves.push({ from, to, path, isHop: true });
    }
  }
  return moves;
}

/** Every legal move for `player`. */
export function getAllMoves(state: Pick<GameState, 'board'>, player: Player): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === player) moves.push(...getLegalDestinations(state, i));
  }
  return moves;
}

/** Whether `player` has at least one legal move. */
export function hasAnyMove(board: readonly Cell[], player: Player): boolean {
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== player) continue;
    for (const n of HOLES[i].neighbors) if (board[n] === null) return true;
    for (const { over, to } of HOLES[i].jumps) {
      if (to >= 0 && board[over] !== null && board[to] === null) return true;
    }
  }
  return false;
}

/** Pegs of `player` currently in their target triangle. */
export function pegsInTarget(board: readonly Cell[], player: Player): number {
  let n = 0;
  for (const i of TARGET[player]) if (board[i] === player) n++;
  return n;
}

/**
 * A player has won when every hole of their target triangle is occupied and at
 * least one of those pegs is their own (so a player can't block by never leaving home).
 */
export function hasWon(board: readonly Cell[], player: Player): boolean {
  let own = 0;
  for (const i of TARGET[player]) {
    const c = board[i];
    if (c === null) return false;
    if (c === player) own++;
  }
  return own > 0;
}

/**
 * Applies a move and returns the new state. The destination must be one returned by
 * `getLegalDestinations`; otherwise the state is returned unchanged.
 */
export function makeMove(state: GameState, from: number, to: number): GameState {
  if (state.isGameOver) return state;
  const mover = state.currentPlayer;
  if (state.board[from] !== mover) return state;
  const move = getLegalDestinations(state, from).find((m) => m.to === to);
  if (!move) return state;
  return applyMove(state, move);
}

/** Applies an already-validated move (as produced by `getLegalDestinations`). */
export function applyMove(state: GameState, move: Move): GameState {
  const mover = state.currentPlayer;
  const board = state.board.slice();
  board[move.to] = board[move.from];
  board[move.from] = null;
  const moveCount = state.moveCount + 1;

  let winner: Outcome | null = null;
  let endedByMoveLimit = false;
  if (hasWon(board, mover)) winner = mover;
  else if (hasWon(board, opponent(mover))) winner = opponent(mover);
  else if (moveCount >= MOVE_LIMIT) {
    endedByMoveLimit = true;
    const p1 = pegsInTarget(board, 'player1');
    const p2 = pegsInTarget(board, 'player2');
    winner = p1 > p2 ? 'player1' : p2 > p1 ? 'player2' : 'draw';
  }

  // If the next player is completely blocked (practically never happens), they pass.
  let next: Player = opponent(mover);
  if (!winner && !hasAnyMove(board, next)) next = mover;

  return {
    board,
    currentPlayer: winner ? mover : next,
    moveCount,
    lastMove: { ...move, path: move.path.slice(), player: mover },
    winner,
    isGameOver: winner !== null,
    endedByMoveLimit,
  };
}
