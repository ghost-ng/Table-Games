import {
  type GameState,
  type LineOrientation,
  getAvailableLines,
  getBoxSideCount,
  drawLine,
} from '../engines/dots-and-boxes';

type Move = { orientation: LineOrientation; row: number; col: number };

const BOX_ROWS = 4;
const BOX_COLS = 4;
const GRID_ROWS = 5;
const GRID_COLS = 5;

/**
 * Returns adjacent boxes for a given line.
 */
function getAdjacentBoxes(
  orientation: LineOrientation,
  row: number,
  col: number
): { row: number; col: number }[] {
  const result: { row: number; col: number }[] = [];
  if (orientation === 'horizontal') {
    if (row < BOX_ROWS) result.push({ row, col });
    if (row > 0) result.push({ row: row - 1, col });
  } else {
    if (col < BOX_COLS) result.push({ row, col });
    if (col > 0) result.push({ row, col: col - 1 });
  }
  return result;
}

/**
 * Count how many boxes a move would complete.
 */
function countCompletions(state: GameState, move: Move): number {
  const adjacent = getAdjacentBoxes(move.orientation, move.row, move.col);
  let count = 0;
  for (const box of adjacent) {
    if (state.boxes[box.row][box.col] === null && getBoxSideCount(state, box.row, box.col) === 3) {
      count++;
    }
  }
  return count;
}

/**
 * Check if a move would create a box with exactly 3 sides (giving the opponent a completion opportunity).
 */
function wouldCreate3SidedBox(state: GameState, move: Move): boolean {
  const adjacent = getAdjacentBoxes(move.orientation, move.row, move.col);
  for (const box of adjacent) {
    if (state.boxes[box.row][box.col] === null && getBoxSideCount(state, box.row, box.col) === 2) {
      return true;
    }
  }
  return false;
}

/**
 * Count how many boxes with 3 sides a move would create (for the opponent to claim).
 */
function count3SidedBoxesCreated(state: GameState, move: Move): number {
  const adjacent = getAdjacentBoxes(move.orientation, move.row, move.col);
  let count = 0;
  for (const box of adjacent) {
    if (state.boxes[box.row][box.col] === null && getBoxSideCount(state, box.row, box.col) === 2) {
      count++;
    }
  }
  return count;
}

/**
 * Given that we must give away boxes, estimate the chain length starting from a move.
 * A chain is a sequence of connected 3-sided boxes that the opponent can claim in a row.
 */
function estimateChainLength(state: GameState, move: Move): number {
  // Simulate the move and count how many boxes become available in a chain
  const newState = drawLine(state, move.orientation, move.row, move.col);
  let chainLength = 0;

  // Count all boxes that now have 3 sides (that weren't 3-sided before)
  for (let r = 0; r < BOX_ROWS; r++) {
    for (let c = 0; c < BOX_COLS; c++) {
      if (newState.boxes[r][c] === null && getBoxSideCount(newState, r, c) === 3) {
        chainLength++;
      }
    }
  }

  return chainLength;
}

export function getAIMove(state: GameState, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Move {
  const available = getAvailableLines(state);
  if (available.length === 0) {
    throw new Error('No available moves');
  }

  if (available.length === 1) {
    return available[0];
  }

  // Easy: always pick a random available line (no strategy)
  if (difficulty === 'easy') {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Priority 1: Complete any box that has 3 sides
  const completingMoves = available.filter((m) => countCompletions(state, m) > 0);
  if (completingMoves.length > 0) {
    // Prefer moves that complete the most boxes
    completingMoves.sort((a, b) => countCompletions(state, b) - countCompletions(state, a));
    return completingMoves[0];
  }

  // Priority 2: Find safe moves (don't give opponent a 3-sided box)
  const safeMoves = available.filter((m) => !wouldCreate3SidedBox(state, m));
  if (safeMoves.length > 0) {
    // Among safe moves, pick randomly
    return safeMoves[Math.floor(Math.random() * safeMoves.length)];
  }

  // Priority 3: All moves are unsafe - choose the one that gives away the shortest chain
  // Sort by chain length (ascending) then by number of 3-sided boxes created (ascending)
  const sorted = [...available].sort((a, b) => {
    const chainA = estimateChainLength(state, a);
    const chainB = estimateChainLength(state, b);
    if (chainA !== chainB) return chainA - chainB;
    const boxes3A = count3SidedBoxesCreated(state, a);
    const boxes3B = count3SidedBoxesCreated(state, b);
    if (boxes3A !== boxes3B) return boxes3A - boxes3B;

    // Hard mode: also consider total chain impact more carefully
    if (difficulty === 'hard') {
      // Prefer moves that leave fewer overall 3-sided boxes on the board after the move
      const stateA = drawLine(state, a.orientation, a.row, a.col);
      const stateB = drawLine(state, b.orientation, b.row, b.col);
      let total3A = 0;
      let total3B = 0;
      for (let r = 0; r < BOX_ROWS; r++) {
        for (let c = 0; c < BOX_COLS; c++) {
          if (stateA.boxes[r][c] === null && getBoxSideCount(stateA, r, c) === 3) total3A++;
          if (stateB.boxes[r][c] === null && getBoxSideCount(stateB, r, c) === 3) total3B++;
        }
      }
      return total3A - total3B;
    }

    return 0;
  });

  return sorted[0];
}
