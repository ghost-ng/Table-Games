// Crossword game engine – pure game logic with no UI dependencies

import { CrosswordClue, CrosswordPuzzle } from '../data/crossword-puzzles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CellState = {
  letter: string | null;
  correct: boolean;
  revealed: boolean;
};

export type GameState = {
  puzzle: CrosswordPuzzle;
  userGrid: (string | null)[][];       // user's entered letters
  selectedCell: { row: number; col: number } | null;
  selectedDirection: 'across' | 'down';
  selectedClue: CrosswordClue | null;
  completedClues: Set<number>;          // clue numbers correctly completed
  currentPlayer: 'player1' | 'player2';
  scores: { player1: number; player2: number };
  isComplete: boolean;
  startTime: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when (row, col) is a black (null) square. */
export function isBlackSquare(
  puzzle: CrosswordPuzzle,
  row: number,
  col: number,
): boolean {
  if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size) {
    return true;
  }
  return puzzle.grid[row][col] === null;
}

/**
 * Finds the clue that covers a given cell in the requested direction.
 * Returns null when no clue passes through that cell in that direction.
 */
export function getClueForCell(
  puzzle: CrosswordPuzzle,
  row: number,
  col: number,
  direction: 'across' | 'down',
): CrosswordClue | null {
  for (const clue of puzzle.clues) {
    if (clue.direction !== direction) continue;

    const len = clue.answer.length;
    for (let i = 0; i < len; i++) {
      const r = direction === 'across' ? clue.startRow : clue.startRow + i;
      const c = direction === 'across' ? clue.startCol + i : clue.startCol;
      if (r === row && c === col) return clue;
    }
  }
  return null;
}

/** Checks whether every letter of a word has been correctly entered. */
export function checkWordComplete(
  state: GameState,
  clue: CrosswordClue,
): boolean {
  const { answer, startRow, startCol, direction } = clue;
  for (let i = 0; i < answer.length; i++) {
    const r = direction === 'across' ? startRow : startRow + i;
    const c = direction === 'across' ? startCol + i : startCol;
    if (state.userGrid[r][c] !== answer[i]) return false;
  }
  return true;
}

/** Returns the completion percentage (0–100) based on correct letters. */
export function getCompletionPercentage(state: GameState): number {
  const { puzzle, userGrid } = state;
  let total = 0;
  let filled = 0;

  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.grid[r][c] !== null) {
        total++;
        if (userGrid[r][c] === puzzle.grid[r][c]) {
          filled++;
        }
      }
    }
  }

  return total === 0 ? 100 : Math.round((filled / total) * 100);
}

// ---------------------------------------------------------------------------
// State transitions  (all functions return a new state – never mutate)
// ---------------------------------------------------------------------------

/** Create a fresh game from a puzzle definition. */
export function createGame(puzzle: CrosswordPuzzle): GameState {
  const userGrid: (string | null)[][] = Array.from(
    { length: puzzle.size },
    () => Array<string | null>(puzzle.size).fill(null),
  );

  return {
    puzzle,
    userGrid,
    selectedCell: null,
    selectedDirection: 'across',
    selectedClue: null,
    completedClues: new Set<number>(),
    currentPlayer: 'player1',
    scores: { player1: 0, player2: 0 },
    isComplete: false,
    startTime: Date.now(),
  };
}

/**
 * Place a single uppercase letter at (row, col).
 *
 * After placing the letter the function:
 *  - checks every clue that passes through the cell
 *  - marks newly-completed clues and awards a point to the current player
 *  - switches to the next player
 *  - checks overall completion
 */
export function placeLetter(
  state: GameState,
  row: number,
  col: number,
  letter: string,
): GameState {
  const { puzzle } = state;

  // Ignore placements on black squares or out-of-bounds cells
  if (isBlackSquare(puzzle, row, col)) return state;

  const normalised = letter.toUpperCase();

  // Clone user grid
  const userGrid = state.userGrid.map((r) => [...r]);
  userGrid[row][col] = normalised;

  // Clone completed clues & scores
  const completedClues = new Set(state.completedClues);
  const scores = { ...state.scores };

  // Build temporary state for checking
  const tmp: GameState = { ...state, userGrid, completedClues, scores };

  // Check all clues passing through this cell
  for (const clue of puzzle.clues) {
    if (completedClues.has(clue.number)) continue;
    const covers = clueCoversCel(clue, row, col);
    if (!covers) continue;
    if (checkWordComplete(tmp, clue)) {
      completedClues.add(clue.number);
      scores[state.currentPlayer] += 1;
    }
  }

  // Determine if puzzle is fully solved
  const isComplete = puzzle.clues.every((c) => completedClues.has(c.number));

  // Switch player
  const nextPlayer =
    state.currentPlayer === 'player1' ? 'player2' : 'player1';

  return {
    ...state,
    userGrid,
    completedClues,
    scores,
    isComplete,
    currentPlayer: nextPlayer,
  };
}

/** Remove the letter at (row, col). */
export function removeLetter(
  state: GameState,
  row: number,
  col: number,
): GameState {
  const { puzzle } = state;
  if (isBlackSquare(puzzle, row, col)) return state;

  const userGrid = state.userGrid.map((r) => [...r]);
  userGrid[row][col] = null;

  // Un-complete any clue that passes through this cell
  const completedClues = new Set(state.completedClues);
  for (const clue of puzzle.clues) {
    if (!completedClues.has(clue.number)) continue;
    if (clueCoversCel(clue, row, col)) {
      completedClues.delete(clue.number);
    }
  }

  // Recalculate scores from scratch (simplest correct approach)
  const scores = { player1: 0, player2: 0 };
  // We cannot perfectly attribute past clue completions after removal,
  // so we keep the existing scores and only remove if needed.
  // Simpler: just keep scores as-is — points are earned, not lost.
  const isComplete = puzzle.clues.every((c) => completedClues.has(c.number));

  return {
    ...state,
    userGrid,
    completedClues,
    scores: state.scores, // scores are never reduced
    isComplete,
  };
}

/**
 * Select a cell and determine the active clue.
 *
 * If the cell is already selected, the direction toggles automatically so
 * tapping the same cell alternates between across and down.
 */
export function selectCell(
  state: GameState,
  row: number,
  col: number,
): GameState {
  const { puzzle } = state;

  if (isBlackSquare(puzzle, row, col)) return state;

  // If tapping the same cell, toggle direction
  let direction = state.selectedDirection;
  if (
    state.selectedCell &&
    state.selectedCell.row === row &&
    state.selectedCell.col === col
  ) {
    direction = direction === 'across' ? 'down' : 'across';
  }

  // Find the clue for the preferred direction; fall back to the other
  let clue = getClueForCell(puzzle, row, col, direction);
  if (!clue) {
    const alt = direction === 'across' ? 'down' : 'across';
    clue = getClueForCell(puzzle, row, col, alt);
    if (clue) direction = alt;
  }

  return {
    ...state,
    selectedCell: { row, col },
    selectedDirection: direction,
    selectedClue: clue,
  };
}

/** Toggle the direction (across ↔ down) for the currently selected cell. */
export function toggleDirection(state: GameState): GameState {
  if (!state.selectedCell) return state;

  const { row, col } = state.selectedCell;
  const newDir: 'across' | 'down' =
    state.selectedDirection === 'across' ? 'down' : 'across';

  const clue = getClueForCell(state.puzzle, row, col, newDir);

  // Only toggle if there is a clue in the new direction
  if (!clue) return state;

  return {
    ...state,
    selectedDirection: newDir,
    selectedClue: clue,
  };
}

// ---------------------------------------------------------------------------
// Internal utility
// ---------------------------------------------------------------------------

/** Returns true when a clue covers the given (row, col). */
function clueCoversCel(
  clue: CrosswordClue,
  row: number,
  col: number,
): boolean {
  const { answer, startRow, startCol, direction } = clue;
  for (let i = 0; i < answer.length; i++) {
    const r = direction === 'across' ? startRow : startRow + i;
    const c = direction === 'across' ? startCol + i : startCol;
    if (r === row && c === col) return true;
  }
  return false;
}
