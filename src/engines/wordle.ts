export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export type LetterState = 'correct' | 'present' | 'absent';

export type GameState = {
  answer: string;
  guesses: string[]; // submitted guesses, uppercase
  evaluations: LetterState[][]; // one row per submitted guess
  isGameOver: boolean;
  isWon: boolean;
};

export function createGame(answer: string): GameState {
  return {
    answer: answer.toUpperCase(),
    guesses: [],
    evaluations: [],
    isGameOver: false,
    isWon: false,
  };
}

/**
 * Score a guess against the answer. Exact matches are claimed first, then
 * misplaced letters are marked `present` only while unclaimed copies remain,
 * so a guess never shows more copies of a letter than the answer has.
 */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(WORD_LENGTH).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const letter = guess[i];
    if (remaining[letter] > 0) {
      result[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return result;
}

/** Apply a guess (already validated as a real word). Returns the new state. */
export function submitGuess(state: GameState, guess: string): GameState {
  if (state.isGameOver) return state;
  const upper = guess.toUpperCase();
  const evaluation = evaluateGuess(upper, state.answer);
  const guesses = [...state.guesses, upper];
  const isWon = upper === state.answer;

  return {
    ...state,
    guesses,
    evaluations: [...state.evaluations, evaluation],
    isWon,
    isGameOver: isWon || guesses.length >= MAX_GUESSES,
  };
}

/** Best-known state per letter across all guesses, for colouring the keyboard. */
export function getKeyboardStates(state: GameState): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };
  const states: Record<string, LetterState> = {};

  state.guesses.forEach((guess, row) => {
    guess.split('').forEach((letter, i) => {
      const next = state.evaluations[row][i];
      const prev = states[letter];
      if (!prev || rank[next] > rank[prev]) states[letter] = next;
    });
  });

  return states;
}
