// Hangman AI - word selection and hangman figure helpers

import { EASY_WORDS, MEDIUM_WORDS, HARD_WORDS, ALL_WORDS } from '../data/words';

/**
 * Selects a random word from the word list.
 * If a difficulty is specified, picks from the corresponding list.
 * Otherwise picks from all words.
 */
export function selectWord(difficulty?: 'easy' | 'medium' | 'hard'): string {
  let wordList: string[];

  switch (difficulty) {
    case 'easy':
      wordList = EASY_WORDS;
      break;
    case 'medium':
      wordList = MEDIUM_WORDS;
      break;
    case 'hard':
      wordList = HARD_WORDS;
      break;
    default:
      wordList = ALL_WORDS;
      break;
  }

  const index = Math.floor(Math.random() * wordList.length);
  return wordList[index];
}

/**
 * Total number of hangman stages: 0 (empty gallows) through 6 (full body).
 */
export const HANGMAN_STAGES = 7; // 0 = empty, 1-6 = body parts

/**
 * All body parts in order of drawing.
 * Index 0 is always 'gallows' (drawn from the start).
 * Indices 1-6 correspond to wrong guesses 1-6.
 */
const BODY_PARTS = [
  'gallows',
  'head',
  'body',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg',
] as const;

export type HangmanPart = (typeof BODY_PARTS)[number];

/**
 * Returns an array of body part names that should be drawn for the given
 * number of wrong guesses.
 *
 * - 0 wrong guesses  -> ['gallows']
 * - 1 wrong guess    -> ['gallows', 'head']
 * - 2 wrong guesses  -> ['gallows', 'head', 'body']
 * - ...
 * - 6 wrong guesses  -> ['gallows', 'head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']
 */
export function getHangmanParts(wrongGuesses: number): string[] {
  // Clamp to valid range
  const clamped = Math.max(0, Math.min(wrongGuesses, 6));
  // Always include gallows (index 0), then add one part per wrong guess
  return BODY_PARTS.slice(0, clamped + 1) as unknown as string[];
}
