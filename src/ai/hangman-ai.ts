// Hangman AI - word selection

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
