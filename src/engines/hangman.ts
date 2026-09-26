// Hangman game engine - pure game logic with no UI dependencies

export const MAX_WRONG_GUESSES = 6;

export type GameState = {
  secretWord: string;           // The word to guess (uppercase)
  guessedLetters: Set<string>;  // Letters already guessed
  wrongGuesses: number;         // Count of wrong guesses
  maxWrongGuesses: number;      // Always 6
  displayWord: string[];        // Array of letters or '_' for unguessed
  isGameOver: boolean;
  isWinner: boolean;
  currentPlayer: 'player1' | 'player2'; // For 2P: player1 picks word, player2 guesses
};

/**
 * Returns an array of revealed letters and '_' for unguessed letters.
 */
export function getDisplayWord(state: GameState): string[] {
  return state.secretWord
    .split('')
    .map((letter) => (state.guessedLetters.has(letter) ? letter : '_'));
}

/**
 * Checks whether every letter in the secret word has been guessed.
 */
export function isWinner(state: GameState): boolean {
  return state.secretWord
    .split('')
    .every((letter) => state.guessedLetters.has(letter));
}

/**
 * Checks whether the game is over (either won or lost).
 */
export function isGameOver(state: GameState): boolean {
  return isWinner(state) || state.wrongGuesses >= state.maxWrongGuesses;
}

/**
 * Creates a new game state with the given secret word.
 * The word is normalized to uppercase and trimmed.
 */
export function createGame(word: string): GameState {
  const secretWord = word.trim().toUpperCase();

  if (secretWord.length === 0) {
    throw new Error('Secret word must not be empty.');
  }

  if (!/^[A-Z]+$/.test(secretWord)) {
    throw new Error('Secret word must contain only letters A-Z.');
  }

  const state: GameState = {
    secretWord,
    guessedLetters: new Set<string>(),
    wrongGuesses: 0,
    maxWrongGuesses: MAX_WRONG_GUESSES,
    displayWord: [],
    isGameOver: false,
    isWinner: false,
    currentPlayer: 'player2', // player2 guesses by default
  };

  state.displayWord = getDisplayWord(state);
  return state;
}

/**
 * Processes a letter guess and returns a new (immutable) game state.
 * - If the game is already over, returns the state unchanged.
 * - If the letter was already guessed, returns the state unchanged.
 * - If the letter is in the secret word, it is revealed.
 * - If the letter is not in the secret word, wrongGuesses increments.
 */
export function guessLetter(state: GameState, letter: string): GameState {
  const normalizedLetter = letter.trim().toUpperCase();

  // Validate input
  if (normalizedLetter.length !== 1 || !/^[A-Z]$/.test(normalizedLetter)) {
    return state; // Invalid input, no change
  }

  // If game is already over, no change
  if (state.isGameOver) {
    return state;
  }

  // If letter already guessed, no change
  if (state.guessedLetters.has(normalizedLetter)) {
    return state;
  }

  // Create new guessedLetters set (immutable update)
  const newGuessedLetters = new Set(state.guessedLetters);
  newGuessedLetters.add(normalizedLetter);

  // Check if the letter is in the secret word
  const isCorrectGuess = state.secretWord.includes(normalizedLetter);
  const newWrongGuesses = isCorrectGuess
    ? state.wrongGuesses
    : state.wrongGuesses + 1;

  // Build the new state
  const newState: GameState = {
    ...state,
    guessedLetters: newGuessedLetters,
    wrongGuesses: newWrongGuesses,
    displayWord: [],
    isGameOver: false,
    isWinner: false,
  };

  // Derive computed fields
  newState.displayWord = getDisplayWord(newState);
  newState.isWinner = isWinner(newState);
  newState.isGameOver = isGameOver(newState);

  return newState;
}
