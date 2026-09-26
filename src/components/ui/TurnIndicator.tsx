import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';

export interface TurnIndicatorProps {
  currentPlayer: 'player1' | 'player2';
  playerNames?: { player1: string; player2: string };
}

export function TurnIndicator({
  currentPlayer,
  playerNames = { player1: 'Player 1', player2: 'Player 2' },
}: TurnIndicatorProps) {
  const { theme } = useTheme();
  const displayName = playerNames[currentPlayer];
  const label = displayName === 'You' ? 'Your Turn' : `${displayName}'s Turn`;
  return (
    <View
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      style={{
        minHeight: 48,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        backgroundColor: theme.colors.surfaceSunken,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors[currentPlayer],
        borderRadius: theme.borderRadius.md,
      }}
    >
      <ThemedText variant="label" style={{ color: theme.colors.text, fontWeight: '600', fontSize: 16 }}>
        {label}
      </ThemedText>
    </View>
  );
}
