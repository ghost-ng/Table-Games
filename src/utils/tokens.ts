import { ImageSourcePropType } from 'react-native';
import { ThemeName } from '../theme/types';

interface GameTokens {
  tttX: ImageSourcePropType;
  tttO: ImageSourcePropType;
  checkerP1: ImageSourcePropType;
  checkerP2: ImageSourcePropType;
}

export const THEME_TOKENS: Record<ThemeName, GameTokens> = {
  retro: {
    tttX: require('../../assets/pieces/retro/ttt-x.webp'),
    tttO: require('../../assets/pieces/retro/ttt-o.webp'),
    checkerP1: require('../../assets/pieces/retro/checker-p1.webp'),
    checkerP2: require('../../assets/pieces/retro/checker-p2.webp'),
  },
  arcade: {
    tttX: require('../../assets/pieces/arcade/ttt-x.webp'),
    tttO: require('../../assets/pieces/arcade/ttt-o.webp'),
    checkerP1: require('../../assets/pieces/arcade/checker-p1.webp'),
    checkerP2: require('../../assets/pieces/arcade/checker-p2.webp'),
  },
  modern: {
    tttX: require('../../assets/pieces/modern/ttt-x.webp'),
    tttO: require('../../assets/pieces/modern/ttt-o.webp'),
    checkerP1: require('../../assets/pieces/modern/checker-p1.webp'),
    checkerP2: require('../../assets/pieces/modern/checker-p2.webp'),
  },
};
