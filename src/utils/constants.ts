import { ImageSourcePropType } from 'react-native';

export const GAME_THUMBNAILS: Record<string, ImageSourcePropType> = {
  'tic-tac-toe': require('../../assets/games/tic-tac-toe.webp'),
  'connect-four': require('../../assets/games/connect-four.webp'),
  'checkers': require('../../assets/games/checkers.webp'),
  'chinese-checkers': require('../../assets/games/chinese-checkers.webp'),
  'mancala': require('../../assets/games/mancala.webp'),
  'trouble': require('../../assets/games/trouble.webp'),
  'dots-and-boxes': require('../../assets/games/dots-and-boxes.webp'),
  'hangman': require('../../assets/games/hangman.webp'),
  'word-search': require('../../assets/games/word-search.webp'),
  'crossword': require('../../assets/games/crossword.webp'),
  'boggle': require('../../assets/games/boggle.webp'),
  'wordle': require('../../assets/games/wordle.webp'),
  'coin-flip': require('../../assets/games/coin-flip.webp'),
  'dice': require('../../assets/games/dice.webp'),
};

/** Games: picking one asks for Solo vs Pass & Play, then opens /games/<id>. Board games first, then word games. */
export const GAMES = [
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', emoji: '❌' },
  { id: 'connect-four', name: 'Four in a Row', emoji: '🔴' },
  { id: 'checkers', name: 'Checkers', emoji: '⚫' },
  { id: 'chinese-checkers', name: 'Chinese Checkers', emoji: '✡️' },
  { id: 'mancala', name: 'Mancala', emoji: '🪨' },
  { id: 'trouble', name: 'Pop & Race', emoji: '🎲' },
  { id: 'dots-and-boxes', name: 'Dots & Boxes', emoji: '⬜' },
  { id: 'hangman', name: 'Hangman', emoji: '🪢' },
  { id: 'word-search', name: 'Word Search', emoji: '🔍' },
  { id: 'crossword', name: 'Crossword', emoji: '📝' },
  { id: 'boggle', name: 'Word Grid', emoji: '🔤' },
  { id: 'wordle', name: 'Word Guess', emoji: '🟩' },
] as const;

/** Tools: no modes or scores; they open /games/<id> directly. */
export const TOOLS = [
  { id: 'coin-flip', name: 'Coin Flip', emoji: '🪙' },
  { id: 'dice', name: 'Dice', emoji: '🎲' },
] as const;

export type GameId = (typeof GAMES)[number]['id'];

export const AD_FREE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const INTERSTITIAL_FREQUENCY = 3; // show interstitial every N completed games
export const AD_FREE_PRICE = '$2.99';
