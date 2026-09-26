import { MAX_WRONG_GUESSES } from '../engines/hangman';

export type HangmanStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Select a valid illustration, including the empty platform at zero misses. */
export function getHangmanStage(wrongGuesses: number): HangmanStage {
  if (Number.isNaN(wrongGuesses)) return 0;
  return Math.max(0, Math.min(MAX_WRONG_GUESSES, Math.trunc(wrongGuesses))) as HangmanStage;
}
