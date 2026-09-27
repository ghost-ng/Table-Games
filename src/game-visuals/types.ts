import type { ImageSourcePropType } from 'react-native';
import type { DICE_KINDS, HANGMAN_STAGES } from './catalog';

export type DiceKind = typeof DICE_KINDS[number];
export type HangmanStage = typeof HANGMAN_STAGES[number];

export interface GameVisuals {
  ticTacToe: { x: ImageSourcePropType; o: ImageSourcePropType };
  connectFour: { player1: ImageSourcePropType; player2: ImageSourcePropType };
  checkers: { player1: ImageSourcePropType; player2: ImageSourcePropType; crown: ImageSourcePropType };
  chineseCheckers: { marbles: readonly ImageSourcePropType[] };
  mancala: { seeds: readonly ImageSourcePropType[] };
  trouble: { pawns: readonly ImageSourcePropType[] };
  coinFlip: { heads: ImageSourcePropType; tails: ImageSourcePropType; edge: ImageSourcePropType };
  dice: Record<DiceKind, ImageSourcePropType>;
  hangman: Record<HangmanStage, ImageSourcePropType>;
}
