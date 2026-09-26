import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';

export interface ScoreDisplayProps {
  scores: {
    player1: number;
    player2: number;
  };
  labels?: {
    player1: string;
    player2: string;
  };
}

export function ScoreDisplay({
  scores,
  labels = { player1: 'Player 1', player2: 'Player 2' },
}: ScoreDisplayProps) {
  const { theme } = useTheme();

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${labels.player1}: ${scores.player1}. ${labels.player2}: ${scores.player2}.`}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceSunken,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.playerScore, { borderBottomColor: theme.colors.player1 }]}>
        <ThemedText
          variant="caption"
          style={[styles.label, { color: theme.colors.text }]}
        >
          {labels.player1}
        </ThemedText>
        <ThemedText
          variant="heading"
          style={[styles.score, { color: theme.colors.text }]}
        >
          {scores.player1}
        </ThemedText>
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.colors.border }]}
      />

      <View style={[styles.playerScore, { borderBottomColor: theme.colors.player2 }]}>
        <ThemedText
          variant="caption"
          style={[styles.label, { color: theme.colors.text }]}
        >
          {labels.player2}
        </ThemedText>
        <ThemedText
          variant="heading"
          style={[styles.score, { color: theme.colors.text }]}
        >
          {scores.player2}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
  },
  playerScore: {
    flex: 1,
    alignItems: 'center',
    borderBottomWidth: 3,
    paddingBottom: 4,
  },
  label: {
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  score: {
    fontSize: 28,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
});
