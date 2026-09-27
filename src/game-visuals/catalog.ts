import type { ThemeName } from '../theme/types';

export const THEME_NAMES = ['modern', 'retro', 'arcade'] as const satisfies readonly ThemeName[];
export const DICE_KINDS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;
export const HANGMAN_STAGES = [0, 1, 2, 3, 4, 5, 6] as const;
export const REQUIRED_FILES = {
  'tic-tac-toe': ['x.webp', 'o.webp'],
  'connect-four': ['player-1.webp', 'player-2.webp'],
  'checkers': ['player-1.webp', 'player-2.webp', 'king-crown.webp'],
  'chinese-checkers': ['marble-1.webp', 'marble-2.webp', 'marble-3.webp', 'marble-4.webp', 'marble-5.webp', 'marble-6.webp'],
  'mancala': ['seed-1.webp', 'seed-2.webp', 'seed-3.webp', 'seed-4.webp', 'seed-5.webp', 'seed-6.webp'],
  'trouble': ['pawn-1.webp', 'pawn-2.webp', 'pawn-3.webp', 'pawn-4.webp'],
  'coin-flip': ['heads.webp', 'tails.webp', 'edge.webp'],
  'dice': ['d4.webp', 'd6.webp', 'd8.webp', 'd10.webp', 'd12.webp', 'd20.webp'],
  'hangman': ['stage-0.webp', 'stage-1.webp', 'stage-2.webp', 'stage-3.webp', 'stage-4.webp', 'stage-5.webp', 'stage-6.webp']
} as const;

/** Pure relative paths for build validation; never imports bitmap modules. */
export const GAME_VISUAL_PATHS = {
  modern: {
    ticTacToe: { x: 'assets/pieces/modern/tic-tac-toe/x.webp', o: 'assets/pieces/modern/tic-tac-toe/o.webp' },
    connectFour: { player1: 'assets/pieces/modern/connect-four/player-1.webp', player2: 'assets/pieces/modern/connect-four/player-2.webp' },
    checkers: { player1: 'assets/pieces/modern/checkers/player-1.webp', player2: 'assets/pieces/modern/checkers/player-2.webp', crown: 'assets/pieces/modern/checkers/king-crown.webp' },
    chineseCheckers: { marbles: ['assets/pieces/modern/chinese-checkers/marble-1.webp', 'assets/pieces/modern/chinese-checkers/marble-2.webp', 'assets/pieces/modern/chinese-checkers/marble-3.webp', 'assets/pieces/modern/chinese-checkers/marble-4.webp', 'assets/pieces/modern/chinese-checkers/marble-5.webp', 'assets/pieces/modern/chinese-checkers/marble-6.webp'] },
    mancala: { seeds: ['assets/pieces/modern/mancala/seed-1.webp', 'assets/pieces/modern/mancala/seed-2.webp', 'assets/pieces/modern/mancala/seed-3.webp', 'assets/pieces/modern/mancala/seed-4.webp', 'assets/pieces/modern/mancala/seed-5.webp', 'assets/pieces/modern/mancala/seed-6.webp'] },
    trouble: { pawns: ['assets/pieces/modern/trouble/pawn-1.webp', 'assets/pieces/modern/trouble/pawn-2.webp', 'assets/pieces/modern/trouble/pawn-3.webp', 'assets/pieces/modern/trouble/pawn-4.webp'] },
    coinFlip: { heads: 'assets/pieces/modern/coin-flip/heads.webp', tails: 'assets/pieces/modern/coin-flip/tails.webp', edge: 'assets/pieces/modern/coin-flip/edge.webp' },
    dice: { d4: 'assets/pieces/modern/dice/d4.webp', d6: 'assets/pieces/modern/dice/d6.webp', d8: 'assets/pieces/modern/dice/d8.webp', d10: 'assets/pieces/modern/dice/d10.webp', d12: 'assets/pieces/modern/dice/d12.webp', d20: 'assets/pieces/modern/dice/d20.webp' },
    hangman: { 0: 'assets/pieces/modern/hangman/stage-0.webp', 1: 'assets/pieces/modern/hangman/stage-1.webp', 2: 'assets/pieces/modern/hangman/stage-2.webp', 3: 'assets/pieces/modern/hangman/stage-3.webp', 4: 'assets/pieces/modern/hangman/stage-4.webp', 5: 'assets/pieces/modern/hangman/stage-5.webp', 6: 'assets/pieces/modern/hangman/stage-6.webp' }
  },
  retro: {
    ticTacToe: { x: 'assets/pieces/retro/tic-tac-toe/x.webp', o: 'assets/pieces/retro/tic-tac-toe/o.webp' },
    connectFour: { player1: 'assets/pieces/retro/connect-four/player-1.webp', player2: 'assets/pieces/retro/connect-four/player-2.webp' },
    checkers: { player1: 'assets/pieces/retro/checkers/player-1.webp', player2: 'assets/pieces/retro/checkers/player-2.webp', crown: 'assets/pieces/retro/checkers/king-crown.webp' },
    chineseCheckers: { marbles: ['assets/pieces/retro/chinese-checkers/marble-1.webp', 'assets/pieces/retro/chinese-checkers/marble-2.webp', 'assets/pieces/retro/chinese-checkers/marble-3.webp', 'assets/pieces/retro/chinese-checkers/marble-4.webp', 'assets/pieces/retro/chinese-checkers/marble-5.webp', 'assets/pieces/retro/chinese-checkers/marble-6.webp'] },
    mancala: { seeds: ['assets/pieces/retro/mancala/seed-1.webp', 'assets/pieces/retro/mancala/seed-2.webp', 'assets/pieces/retro/mancala/seed-3.webp', 'assets/pieces/retro/mancala/seed-4.webp', 'assets/pieces/retro/mancala/seed-5.webp', 'assets/pieces/retro/mancala/seed-6.webp'] },
    trouble: { pawns: ['assets/pieces/retro/trouble/pawn-1.webp', 'assets/pieces/retro/trouble/pawn-2.webp', 'assets/pieces/retro/trouble/pawn-3.webp', 'assets/pieces/retro/trouble/pawn-4.webp'] },
    coinFlip: { heads: 'assets/pieces/retro/coin-flip/heads.webp', tails: 'assets/pieces/retro/coin-flip/tails.webp', edge: 'assets/pieces/retro/coin-flip/edge.webp' },
    dice: { d4: 'assets/pieces/retro/dice/d4.webp', d6: 'assets/pieces/retro/dice/d6.webp', d8: 'assets/pieces/retro/dice/d8.webp', d10: 'assets/pieces/retro/dice/d10.webp', d12: 'assets/pieces/retro/dice/d12.webp', d20: 'assets/pieces/retro/dice/d20.webp' },
    hangman: { 0: 'assets/pieces/retro/hangman/stage-0.webp', 1: 'assets/pieces/retro/hangman/stage-1.webp', 2: 'assets/pieces/retro/hangman/stage-2.webp', 3: 'assets/pieces/retro/hangman/stage-3.webp', 4: 'assets/pieces/retro/hangman/stage-4.webp', 5: 'assets/pieces/retro/hangman/stage-5.webp', 6: 'assets/pieces/retro/hangman/stage-6.webp' }
  },
  arcade: {
    ticTacToe: { x: 'assets/pieces/arcade/tic-tac-toe/x.webp', o: 'assets/pieces/arcade/tic-tac-toe/o.webp' },
    connectFour: { player1: 'assets/pieces/arcade/connect-four/player-1.webp', player2: 'assets/pieces/arcade/connect-four/player-2.webp' },
    checkers: { player1: 'assets/pieces/arcade/checkers/player-1.webp', player2: 'assets/pieces/arcade/checkers/player-2.webp', crown: 'assets/pieces/arcade/checkers/king-crown.webp' },
    chineseCheckers: { marbles: ['assets/pieces/arcade/chinese-checkers/marble-1.webp', 'assets/pieces/arcade/chinese-checkers/marble-2.webp', 'assets/pieces/arcade/chinese-checkers/marble-3.webp', 'assets/pieces/arcade/chinese-checkers/marble-4.webp', 'assets/pieces/arcade/chinese-checkers/marble-5.webp', 'assets/pieces/arcade/chinese-checkers/marble-6.webp'] },
    mancala: { seeds: ['assets/pieces/arcade/mancala/seed-1.webp', 'assets/pieces/arcade/mancala/seed-2.webp', 'assets/pieces/arcade/mancala/seed-3.webp', 'assets/pieces/arcade/mancala/seed-4.webp', 'assets/pieces/arcade/mancala/seed-5.webp', 'assets/pieces/arcade/mancala/seed-6.webp'] },
    trouble: { pawns: ['assets/pieces/arcade/trouble/pawn-1.webp', 'assets/pieces/arcade/trouble/pawn-2.webp', 'assets/pieces/arcade/trouble/pawn-3.webp', 'assets/pieces/arcade/trouble/pawn-4.webp'] },
    coinFlip: { heads: 'assets/pieces/arcade/coin-flip/heads.webp', tails: 'assets/pieces/arcade/coin-flip/tails.webp', edge: 'assets/pieces/arcade/coin-flip/edge.webp' },
    dice: { d4: 'assets/pieces/arcade/dice/d4.webp', d6: 'assets/pieces/arcade/dice/d6.webp', d8: 'assets/pieces/arcade/dice/d8.webp', d10: 'assets/pieces/arcade/dice/d10.webp', d12: 'assets/pieces/arcade/dice/d12.webp', d20: 'assets/pieces/arcade/dice/d20.webp' },
    hangman: { 0: 'assets/pieces/arcade/hangman/stage-0.webp', 1: 'assets/pieces/arcade/hangman/stage-1.webp', 2: 'assets/pieces/arcade/hangman/stage-2.webp', 3: 'assets/pieces/arcade/hangman/stage-3.webp', 4: 'assets/pieces/arcade/hangman/stage-4.webp', 5: 'assets/pieces/arcade/hangman/stage-5.webp', 6: 'assets/pieces/arcade/hangman/stage-6.webp' }
  }
} as const;
