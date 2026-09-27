import type { ThemeName } from '../theme/types';
import type { GameVisuals } from './types';

/** Literal local requires keep every theme available to Metro and offline builds. */
export const GAME_VISUALS: Record<ThemeName, GameVisuals> = {
  modern: {
    ticTacToe: { x: require('../../assets/pieces/modern/tic-tac-toe/x.webp'), o: require('../../assets/pieces/modern/tic-tac-toe/o.webp') },
    connectFour: { player1: require('../../assets/pieces/modern/connect-four/player-1.webp'), player2: require('../../assets/pieces/modern/connect-four/player-2.webp') },
    checkers: { player1: require('../../assets/pieces/modern/checkers/player-1.webp'), player2: require('../../assets/pieces/modern/checkers/player-2.webp'), crown: require('../../assets/pieces/modern/checkers/king-crown.webp') },
    chineseCheckers: { marbles: [require('../../assets/pieces/modern/chinese-checkers/marble-1.webp'), require('../../assets/pieces/modern/chinese-checkers/marble-2.webp'), require('../../assets/pieces/modern/chinese-checkers/marble-3.webp'), require('../../assets/pieces/modern/chinese-checkers/marble-4.webp'), require('../../assets/pieces/modern/chinese-checkers/marble-5.webp'), require('../../assets/pieces/modern/chinese-checkers/marble-6.webp')] },
    mancala: { seeds: [require('../../assets/pieces/modern/mancala/seed-1.webp'), require('../../assets/pieces/modern/mancala/seed-2.webp'), require('../../assets/pieces/modern/mancala/seed-3.webp'), require('../../assets/pieces/modern/mancala/seed-4.webp'), require('../../assets/pieces/modern/mancala/seed-5.webp'), require('../../assets/pieces/modern/mancala/seed-6.webp')] },
    trouble: { pawns: [require('../../assets/pieces/modern/trouble/pawn-1.webp'), require('../../assets/pieces/modern/trouble/pawn-2.webp'), require('../../assets/pieces/modern/trouble/pawn-3.webp'), require('../../assets/pieces/modern/trouble/pawn-4.webp')] },
    coinFlip: { heads: require('../../assets/pieces/modern/coin-flip/heads.webp'), tails: require('../../assets/pieces/modern/coin-flip/tails.webp'), edge: require('../../assets/pieces/modern/coin-flip/edge.webp') },
    dice: { d4: require('../../assets/pieces/modern/dice/d4.webp'), d6: require('../../assets/pieces/modern/dice/d6.webp'), d8: require('../../assets/pieces/modern/dice/d8.webp'), d10: require('../../assets/pieces/modern/dice/d10.webp'), d12: require('../../assets/pieces/modern/dice/d12.webp'), d20: require('../../assets/pieces/modern/dice/d20.webp') },
    hangman: { 0: require('../../assets/pieces/modern/hangman/stage-0.webp'), 1: require('../../assets/pieces/modern/hangman/stage-1.webp'), 2: require('../../assets/pieces/modern/hangman/stage-2.webp'), 3: require('../../assets/pieces/modern/hangman/stage-3.webp'), 4: require('../../assets/pieces/modern/hangman/stage-4.webp'), 5: require('../../assets/pieces/modern/hangman/stage-5.webp'), 6: require('../../assets/pieces/modern/hangman/stage-6.webp') }
  },
  retro: {
    ticTacToe: { x: require('../../assets/pieces/retro/tic-tac-toe/x.webp'), o: require('../../assets/pieces/retro/tic-tac-toe/o.webp') },
    connectFour: { player1: require('../../assets/pieces/retro/connect-four/player-1.webp'), player2: require('../../assets/pieces/retro/connect-four/player-2.webp') },
    checkers: { player1: require('../../assets/pieces/retro/checkers/player-1.webp'), player2: require('../../assets/pieces/retro/checkers/player-2.webp'), crown: require('../../assets/pieces/retro/checkers/king-crown.webp') },
    chineseCheckers: { marbles: [require('../../assets/pieces/retro/chinese-checkers/marble-1.webp'), require('../../assets/pieces/retro/chinese-checkers/marble-2.webp'), require('../../assets/pieces/retro/chinese-checkers/marble-3.webp'), require('../../assets/pieces/retro/chinese-checkers/marble-4.webp'), require('../../assets/pieces/retro/chinese-checkers/marble-5.webp'), require('../../assets/pieces/retro/chinese-checkers/marble-6.webp')] },
    mancala: { seeds: [require('../../assets/pieces/retro/mancala/seed-1.webp'), require('../../assets/pieces/retro/mancala/seed-2.webp'), require('../../assets/pieces/retro/mancala/seed-3.webp'), require('../../assets/pieces/retro/mancala/seed-4.webp'), require('../../assets/pieces/retro/mancala/seed-5.webp'), require('../../assets/pieces/retro/mancala/seed-6.webp')] },
    trouble: { pawns: [require('../../assets/pieces/retro/trouble/pawn-1.webp'), require('../../assets/pieces/retro/trouble/pawn-2.webp'), require('../../assets/pieces/retro/trouble/pawn-3.webp'), require('../../assets/pieces/retro/trouble/pawn-4.webp')] },
    coinFlip: { heads: require('../../assets/pieces/retro/coin-flip/heads.webp'), tails: require('../../assets/pieces/retro/coin-flip/tails.webp'), edge: require('../../assets/pieces/retro/coin-flip/edge.webp') },
    dice: { d4: require('../../assets/pieces/retro/dice/d4.webp'), d6: require('../../assets/pieces/retro/dice/d6.webp'), d8: require('../../assets/pieces/retro/dice/d8.webp'), d10: require('../../assets/pieces/retro/dice/d10.webp'), d12: require('../../assets/pieces/retro/dice/d12.webp'), d20: require('../../assets/pieces/retro/dice/d20.webp') },
    hangman: { 0: require('../../assets/pieces/retro/hangman/stage-0.webp'), 1: require('../../assets/pieces/retro/hangman/stage-1.webp'), 2: require('../../assets/pieces/retro/hangman/stage-2.webp'), 3: require('../../assets/pieces/retro/hangman/stage-3.webp'), 4: require('../../assets/pieces/retro/hangman/stage-4.webp'), 5: require('../../assets/pieces/retro/hangman/stage-5.webp'), 6: require('../../assets/pieces/retro/hangman/stage-6.webp') }
  },
  arcade: {
    ticTacToe: { x: require('../../assets/pieces/arcade/tic-tac-toe/x.webp'), o: require('../../assets/pieces/arcade/tic-tac-toe/o.webp') },
    connectFour: { player1: require('../../assets/pieces/arcade/connect-four/player-1.webp'), player2: require('../../assets/pieces/arcade/connect-four/player-2.webp') },
    checkers: { player1: require('../../assets/pieces/arcade/checkers/player-1.webp'), player2: require('../../assets/pieces/arcade/checkers/player-2.webp'), crown: require('../../assets/pieces/arcade/checkers/king-crown.webp') },
    chineseCheckers: { marbles: [require('../../assets/pieces/arcade/chinese-checkers/marble-1.webp'), require('../../assets/pieces/arcade/chinese-checkers/marble-2.webp'), require('../../assets/pieces/arcade/chinese-checkers/marble-3.webp'), require('../../assets/pieces/arcade/chinese-checkers/marble-4.webp'), require('../../assets/pieces/arcade/chinese-checkers/marble-5.webp'), require('../../assets/pieces/arcade/chinese-checkers/marble-6.webp')] },
    mancala: { seeds: [require('../../assets/pieces/arcade/mancala/seed-1.webp'), require('../../assets/pieces/arcade/mancala/seed-2.webp'), require('../../assets/pieces/arcade/mancala/seed-3.webp'), require('../../assets/pieces/arcade/mancala/seed-4.webp'), require('../../assets/pieces/arcade/mancala/seed-5.webp'), require('../../assets/pieces/arcade/mancala/seed-6.webp')] },
    trouble: { pawns: [require('../../assets/pieces/arcade/trouble/pawn-1.webp'), require('../../assets/pieces/arcade/trouble/pawn-2.webp'), require('../../assets/pieces/arcade/trouble/pawn-3.webp'), require('../../assets/pieces/arcade/trouble/pawn-4.webp')] },
    coinFlip: { heads: require('../../assets/pieces/arcade/coin-flip/heads.webp'), tails: require('../../assets/pieces/arcade/coin-flip/tails.webp'), edge: require('../../assets/pieces/arcade/coin-flip/edge.webp') },
    dice: { d4: require('../../assets/pieces/arcade/dice/d4.webp'), d6: require('../../assets/pieces/arcade/dice/d6.webp'), d8: require('../../assets/pieces/arcade/dice/d8.webp'), d10: require('../../assets/pieces/arcade/dice/d10.webp'), d12: require('../../assets/pieces/arcade/dice/d12.webp'), d20: require('../../assets/pieces/arcade/dice/d20.webp') },
    hangman: { 0: require('../../assets/pieces/arcade/hangman/stage-0.webp'), 1: require('../../assets/pieces/arcade/hangman/stage-1.webp'), 2: require('../../assets/pieces/arcade/hangman/stage-2.webp'), 3: require('../../assets/pieces/arcade/hangman/stage-3.webp'), 4: require('../../assets/pieces/arcade/hangman/stage-4.webp'), 5: require('../../assets/pieces/arcade/hangman/stage-5.webp'), 6: require('../../assets/pieces/arcade/hangman/stage-6.webp') }
  }
};

export function getGameVisuals(themeName: ThemeName): GameVisuals {
  return GAME_VISUALS[themeName];
}
