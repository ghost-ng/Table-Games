import { ImageSourcePropType } from 'react-native';

export const GAME_THUMBNAILS: Record<string, ImageSourcePropType> = {
  'tic-tac-toe': require('../../assets/games/tic-tac-toe.webp'),
  'connect-four': require('../../assets/games/connect-four.webp'),
  'hangman': require('../../assets/games/hangman.webp'),
  'dots-and-boxes': require('../../assets/games/dots-and-boxes.webp'),
  'checkers': require('../../assets/games/checkers.webp'),
  'word-search': require('../../assets/games/word-search.webp'),
  'crossword': require('../../assets/games/crossword.webp'),
  'boggle': require('../../assets/games/boggle.webp'),
};

export const GAMES = [
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', emoji: '❌' },
  { id: 'connect-four', name: 'Connect 4', emoji: '🔴' },
  { id: 'hangman', name: 'Hangman', emoji: '🪢' },
  { id: 'dots-and-boxes', name: 'Dots & Boxes', emoji: '⬜' },
  { id: 'checkers', name: 'Checkers', emoji: '⚫' },
  { id: 'word-search', name: 'Word Search', emoji: '🔍' },
  { id: 'crossword', name: 'Crossword', emoji: '📝' },
  { id: 'boggle', name: 'Boggle', emoji: '🔤' },
] as const;

export type GameId = (typeof GAMES)[number]['id'];

export const AD_FREE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const INTERSTITIAL_FREQUENCY = 3; // show interstitial every N completed games
export const AD_FREE_PRICE = '$2.99';
