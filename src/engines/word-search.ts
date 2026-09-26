import { WordSearchPuzzle } from '../data/wordsearch-puzzles';

export type Direction = 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';

export type WordEntry = {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
  found: boolean;
};

export type GameState = {
  grid: string[][];
  words: WordEntry[];
  foundWords: Set<string>;
  currentPlayer: 'player1' | 'player2';
  scores: { player1: number; player2: number };
  isGameOver: boolean;
  winner: 'player1' | 'player2' | 'draw' | null;
  startTime: number;
};

/**
 * Creates a new game state from a puzzle definition.
 */
export function createGame(puzzle: WordSearchPuzzle): GameState {
  // Deep-copy the grid so mutations don't affect the source data
  const grid = puzzle.grid.map((row) => [...row]);

  const words: WordEntry[] = puzzle.words.map((w) => ({
    word: w.word,
    startRow: w.startRow,
    startCol: w.startCol,
    direction: w.direction as Direction,
    found: false,
  }));

  return {
    grid,
    words,
    foundWords: new Set<string>(),
    currentPlayer: 'player1',
    scores: { player1: 0, player2: 0 },
    isGameOver: false,
    winner: null,
    startTime: Date.now(),
  };
}

/**
 * Returns the direction deltas for a given Direction.
 */
function getDeltas(direction: Direction): { dr: number; dc: number } {
  switch (direction) {
    case 'horizontal':
      return { dr: 0, dc: 1 };
    case 'vertical':
      return { dr: 1, dc: 0 };
    case 'diagonal-down':
      return { dr: 1, dc: 1 };
    case 'diagonal-up':
      return { dr: -1, dc: 1 };
  }
}

/**
 * Returns all grid cells occupied by a word entry.
 */
export function getWordCells(
  word: WordEntry,
): { row: number; col: number }[] {
  const { dr, dc } = getDeltas(word.direction);
  const cells: { row: number; col: number }[] = [];

  let row = word.startRow;
  let col = word.startCol;

  for (let i = 0; i < word.word.length; i++) {
    cells.push({ row, col });
    row += dr;
    col += dc;
  }

  return cells;
}

/**
 * Determines the direction (if any) implied by a drag from (startRow, startCol)
 * to (endRow, endCol). Returns null if the selection is not a valid straight line.
 */
function inferDirection(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): Direction | null {
  const dr = endRow - startRow;
  const dc = endCol - startCol;

  if (dr === 0 && dc === 0) return null; // single cell, no direction

  // Horizontal: same row
  if (dr === 0 && dc > 0) return 'horizontal';

  // Vertical: same col, going down
  if (dc === 0 && dr > 0) return 'vertical';

  // Diagonal-down: equal positive deltas
  if (dr > 0 && dc > 0 && dr === dc) return 'diagonal-down';

  // Diagonal-up: row decreases, col increases, magnitudes equal
  if (dr < 0 && dc > 0 && -dr === dc) return 'diagonal-up';

  // Also support reverse selections (user drags backwards).
  // We normalise by swapping start/end so the canonical direction is used.
  // Reverse horizontal
  if (dr === 0 && dc < 0) return 'horizontal';

  // Reverse vertical
  if (dc === 0 && dr < 0) return 'vertical';

  // Reverse diagonal-down (end is upper-left of start)
  if (dr < 0 && dc < 0 && dr === dc) return 'diagonal-down';

  // Reverse diagonal-up (end is lower-left of start)
  if (dr > 0 && dc < 0 && dr === -dc) return 'diagonal-up';

  return null; // not a valid straight line
}

/**
 * Normalises start/end so that the canonical start comes first for the direction.
 */
function normaliseSelection(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): { sRow: number; sCol: number; eRow: number; eCol: number } {
  const dr = endRow - startRow;
  const dc = endCol - startCol;

  // For horizontal: left to right
  if (dr === 0 && dc < 0)
    return { sRow: endRow, sCol: endCol, eRow: startRow, eCol: startCol };

  // For vertical: top to bottom
  if (dc === 0 && dr < 0)
    return { sRow: endRow, sCol: endCol, eRow: startRow, eCol: startCol };

  // For diagonal-down: upper-left to lower-right
  if (dr < 0 && dc < 0 && dr === dc)
    return { sRow: endRow, sCol: endCol, eRow: startRow, eCol: startCol };

  // For diagonal-up: lower-left to upper-right (row decreases, col increases)
  // Canonical start has the higher row (bottom) and lower col (left).
  if (dr > 0 && dc < 0 && dr === -dc)
    return { sRow: endRow, sCol: endCol, eRow: startRow, eCol: startCol };

  return { sRow: startRow, sCol: startCol, eRow: endRow, eCol: endCol };
}

/**
 * Extracts the string of letters from the grid along the given selection.
 */
function extractWord(
  grid: string[][],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): string {
  const direction = inferDirection(startRow, startCol, endRow, endCol);
  if (!direction) return '';

  const { sRow, sCol } = normaliseSelection(
    startRow,
    startCol,
    endRow,
    endCol,
  );
  const { dr, dc } = getDeltas(direction);

  const length =
    direction === 'horizontal'
      ? Math.abs(endCol - startCol) + 1
      : direction === 'vertical'
        ? Math.abs(endRow - startRow) + 1
        : Math.abs(endCol - startCol) + 1; // diagonals: col delta == row delta in magnitude

  let word = '';
  let r = sRow;
  let c = sCol;
  for (let i = 0; i < length; i++) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return '';
    word += grid[r][c];
    r += dr;
    c += dc;
  }

  return word;
}

/**
 * Checks if the user's drag selection matches any unfound word.
 * If it matches, marks the word as found, awards a point to the current player,
 * switches turns, and checks for game completion.
 *
 * Returns the updated state and the matched word (or null if no match).
 */
export function checkSelection(
  state: GameState,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): { state: GameState; word: string | null } {
  if (state.isGameOver) {
    return { state, word: null };
  }

  const direction = inferDirection(startRow, startCol, endRow, endCol);
  if (!direction) {
    return { state, word: null };
  }

  const { sRow, sCol } = normaliseSelection(
    startRow,
    startCol,
    endRow,
    endCol,
  );

  // Extract the selected word from the grid
  const selectedWord = extractWord(
    state.grid,
    startRow,
    startCol,
    endRow,
    endCol,
  );
  if (!selectedWord) {
    return { state, word: null };
  }

  // Find a matching unfound word
  const matchedWord = state.words.find(
    (w) =>
      !w.found &&
      w.word === selectedWord &&
      w.startRow === sRow &&
      w.startCol === sCol &&
      w.direction === direction,
  );

  if (!matchedWord) {
    // No match — switch turns (penalty for wrong guess)
    const newState: GameState = {
      ...state,
      currentPlayer:
        state.currentPlayer === 'player1' ? 'player2' : 'player1',
    };
    return { state: newState, word: null };
  }

  // Mark word as found
  const updatedWords = state.words.map((w) =>
    w.word === matchedWord.word &&
    w.startRow === matchedWord.startRow &&
    w.startCol === matchedWord.startCol
      ? { ...w, found: true }
      : w,
  );

  const updatedFoundWords = new Set(state.foundWords);
  updatedFoundWords.add(matchedWord.word);

  // Award point based on word length
  const points = matchedWord.word.length;
  const updatedScores = { ...state.scores };
  updatedScores[state.currentPlayer] += points;

  // Switch player
  const nextPlayer: 'player1' | 'player2' =
    state.currentPlayer === 'player1' ? 'player2' : 'player1';

  // Check completion
  const allFound = updatedWords.every((w) => w.found);
  let winner: 'player1' | 'player2' | 'draw' | null = null;
  if (allFound) {
    if (updatedScores.player1 > updatedScores.player2) {
      winner = 'player1';
    } else if (updatedScores.player2 > updatedScores.player1) {
      winner = 'player2';
    } else {
      winner = 'draw';
    }
  }

  const newState: GameState = {
    ...state,
    words: updatedWords,
    foundWords: updatedFoundWords,
    currentPlayer: nextPlayer,
    scores: updatedScores,
    isGameOver: allFound,
    winner,
  };

  return { state: newState, word: matchedWord.word };
}

/**
 * Returns true if all words in the puzzle have been found.
 */
export function isPuzzleComplete(state: GameState): boolean {
  return state.words.every((w) => w.found);
}
