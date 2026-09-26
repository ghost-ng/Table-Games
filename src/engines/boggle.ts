import { DICTIONARY } from '../data/dictionary';

// Standard Boggle dice configuration (16 dice for 4x4 board)
export const BOGGLE_DICE = [
  'AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS',
  'AOOTTW', 'CIMOTU', 'DEILRX', 'DELRVY',
  'DISTTY', 'EEGHNW', 'EEINSU', 'EHRTVW',
  'EIOSST', 'ELRTTY', 'HIMNQU', 'HLNNRZ',
];

export type Board = string[][]; // 4x4 grid of single letters
export type Position = { row: number; col: number };
export type FoundWord = { word: string; path: Position[]; score: number };
export type GameState = {
  board: Board;
  foundWords: Map<string, FoundWord>; // player's found words
  foundWordsP2: Map<string, FoundWord>; // player 2's found words (2P mode)
  currentPlayer: 'player1' | 'player2';
  timeRemainingMs: number;
  isGameOver: boolean;
  scores: { player1: number; player2: number };
};

/**
 * Shuffle an array in place using Fisher-Yates.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a 4x4 Boggle board by shuffling dice, picking a random face for each.
 * 'QU' on dice is represented as 'QU' in the cell (counts as two letters when tracing).
 */
export function generateBoard(): Board {
  const dice = shuffle([...BOGGLE_DICE]);
  const board: Board = [];
  for (let r = 0; r < 4; r++) {
    const row: string[] = [];
    for (let c = 0; c < 4; c++) {
      const die = dice[r * 4 + c];
      const faceIndex = Math.floor(Math.random() * 6);
      let letter = die[faceIndex];
      // In standard Boggle, Q always represents QU
      if (letter === 'Q') {
        letter = 'QU';
      }
      row.push(letter);
    }
    board.push(row);
  }
  return board;
}

/**
 * Create a new Boggle game state with a fresh board and 2-minute timer.
 */
export function createGame(): GameState {
  return {
    board: generateBoard(),
    foundWords: new Map<string, FoundWord>(),
    foundWordsP2: new Map<string, FoundWord>(),
    currentPlayer: 'player1',
    timeRemainingMs: 120000,
    isGameOver: false,
    scores: { player1: 0, player2: 0 },
  };
}

/**
 * Returns all adjacent cell positions (up to 8 neighbours) for a given cell.
 */
export function getAdjacentCells(row: number, col: number): Position[] {
  const positions: Position[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
        positions.push({ row: nr, col: nc });
      }
    }
  }
  return positions;
}

/**
 * DFS helper: try to trace `word` starting at position (row, col) with already-visited cells.
 * `index` is the current character index into the word we are trying to match.
 */
function dfs(
  board: Board,
  word: string,
  row: number,
  col: number,
  index: number,
  visited: boolean[][],
  path: Position[],
): Position[] | null {
  const cell = board[row][col]; // could be 'QU' or single letter

  // Check if the cell content matches the word starting at `index`
  if (word.substring(index, index + cell.length) !== cell) {
    return null;
  }

  const nextIndex = index + cell.length;
  visited[row][col] = true;
  path.push({ row, col });

  // If we've matched the entire word, return the path
  if (nextIndex === word.length) {
    const result = [...path];
    visited[row][col] = false;
    path.pop();
    return result;
  }

  // Explore neighbours
  const neighbours = getAdjacentCells(row, col);
  for (const { row: nr, col: nc } of neighbours) {
    if (!visited[nr][nc]) {
      const result = dfs(board, word, nr, nc, nextIndex, visited, path);
      if (result) {
        visited[row][col] = false;
        path.pop();
        return result;
      }
    }
  }

  visited[row][col] = false;
  path.pop();
  return null;
}

/**
 * Check if a word can be traced on the board via adjacent tiles (including diagonals),
 * with no tile reuse.
 */
export function canTraceWord(board: Board, word: string): boolean {
  return traceWord(board, word) !== null;
}

/**
 * Trace a word on the board and return the path if found, or null.
 */
export function traceWord(board: Board, word: string): Position[] | null {
  const visited = Array.from({ length: 4 }, () => Array(4).fill(false));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const result = dfs(board, word, r, c, 0, visited, []);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Check if a word is valid: exists in dictionary AND can be traced on the board.
 */
export function isValidWord(board: Board, word: string): boolean {
  const upper = word.toUpperCase();
  if (upper.length < 3) return false;
  if (!DICTIONARY.has(upper)) return false;
  return canTraceWord(board, upper);
}

/**
 * Calculate Boggle score for a word based on its length.
 * 3-4 letters = 1 point
 * 5 letters = 2 points
 * 6 letters = 3 points
 * 7 letters = 5 points
 * 8+ letters = 11 points
 */
export function calculateScore(wordLength: number): number {
  if (wordLength <= 4) return 1;
  if (wordLength === 5) return 2;
  if (wordLength === 6) return 3;
  if (wordLength === 7) return 5;
  return 11;
}

/**
 * Submit a word for the current player. Validates and adds it if valid.
 * Returns updated state, validity flag, and optional rejection reason.
 */
export function submitWord(
  state: GameState,
  word: string,
): { state: GameState; valid: boolean; reason?: string } {
  const upper = word.toUpperCase();

  if (state.isGameOver) {
    return { state, valid: false, reason: 'Game is over' };
  }

  if (upper.length < 3) {
    return { state, valid: false, reason: 'Word must be at least 3 letters' };
  }

  if (!DICTIONARY.has(upper)) {
    return { state, valid: false, reason: 'Word not in dictionary' };
  }

  // Check if word was already found by the current player
  const currentWords = state.currentPlayer === 'player1'
    ? state.foundWords
    : state.foundWordsP2;

  if (currentWords.has(upper)) {
    return { state, valid: false, reason: 'Word already found' };
  }

  // Try to trace the word on the board
  const path = traceWord(state.board, upper);
  if (!path) {
    return { state, valid: false, reason: 'Word cannot be traced on board' };
  }

  const score = calculateScore(upper.length);
  const foundWord: FoundWord = { word: upper, path, score };

  // Clone maps for immutability
  const newFoundWords = new Map(state.foundWords);
  const newFoundWordsP2 = new Map(state.foundWordsP2);

  if (state.currentPlayer === 'player1') {
    newFoundWords.set(upper, foundWord);
  } else {
    newFoundWordsP2.set(upper, foundWord);
  }

  const newScores = {
    player1: state.currentPlayer === 'player1'
      ? state.scores.player1 + score
      : state.scores.player1,
    player2: state.currentPlayer === 'player2'
      ? state.scores.player2 + score
      : state.scores.player2,
  };

  return {
    state: {
      ...state,
      foundWords: newFoundWords,
      foundWordsP2: newFoundWordsP2,
      scores: newScores,
    },
    valid: true,
  };
}

/**
 * Find all valid words that can be formed on the given board.
 * Uses DFS from every cell, building words character by character and
 * pruning branches that cannot lead to any dictionary word.
 */
export function findAllValidWords(board: Board): string[] {
  const results = new Set<string>();

  // Build a prefix set for pruning: for every word in the dictionary,
  // store all its prefixes (e.g. "CAT" => "C", "CA", "CAT").
  const prefixes = new Set<string>();
  DICTIONARY.forEach((word: string) => {
    for (let i = 1; i <= word.length; i++) {
      prefixes.add(word.substring(0, i));
    }
  });

  function dfsAll(
    row: number,
    col: number,
    visited: boolean[][],
    currentWord: string,
  ): void {
    const cell = board[row][col];
    const newWord = currentWord + cell;

    // Prune: if newWord is not a prefix of any dictionary word, stop
    if (!prefixes.has(newWord)) return;

    // If it is a valid word (3+ letters, in dictionary), record it
    if (newWord.length >= 3 && DICTIONARY.has(newWord)) {
      results.add(newWord);
    }

    // Continue exploring neighbours
    visited[row][col] = true;
    const neighbours = getAdjacentCells(row, col);
    for (const { row: nr, col: nc } of neighbours) {
      if (!visited[nr][nc]) {
        dfsAll(nr, nc, visited, newWord);
      }
    }
    visited[row][col] = false;
  }

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const visited = Array.from({ length: 4 }, () => Array(4).fill(false));
      dfsAll(r, c, visited, '');
    }
  }

  return Array.from(results).sort();
}
