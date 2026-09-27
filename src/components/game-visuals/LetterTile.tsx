import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { TactileCell, type TactileCellProps } from './TactileCell';

export interface LetterTileProps extends TactileCellProps {
  letter: string;
  value?: number;
  clueNumber?: number;
  size?: number;
  variant?: 'crossword' | 'word-grid' | 'word-guess';
  textStyle?: StyleProp<TextStyle>;
}

export function LetterTile({ letter, value, clueNumber, size, variant = 'word-grid', textStyle, children, style, ...props }: LetterTileProps) {
  const { theme } = useTheme();
  return (
    <TactileCell {...props} style={[
      { borderRadius: variant === 'crossword' ? theme.borderRadius.sm : theme.borderRadius.md },
      size === undefined ? undefined : { width: size, height: size },
      style,
    ]}>
      {clueNumber !== undefined && <Text style={{ position: 'absolute', left: 2, top: 1, fontSize: 9, color: theme.colors.text, fontFamily: theme.fonts.body }}>{clueNumber}</Text>}
      <Text style={[{ fontFamily: theme.fonts.body, fontWeight: '700', fontSize: size === undefined ? 22 : size * 0.48, color: theme.colors.text }, textStyle]}>{letter}</Text>
      {value !== undefined && <Text style={{ position: 'absolute', right: 2, top: 1, fontSize: 10, color: theme.colors.text, fontFamily: theme.fonts.body }}>{value}</Text>}
      {children}
    </TactileCell>
  );
}
