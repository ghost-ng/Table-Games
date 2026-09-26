import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import { Button } from './Button';

export interface GameResult {
  winner: 'player1' | 'player2' | 'draw';
  score?: {
    player1: number;
    player2: number;
  };
}

export interface GameOverModalProps {
  visible: boolean;
  result: GameResult;
  onRematch: () => void;
  onHome: () => void;
  gameName: string;
}

export function GameOverModal({
  visible,
  result,
  onRematch,
  onHome,
  gameName,
}: GameOverModalProps) {
  const { theme } = useTheme();

  const getWinnerText = () => {
    if (result.winner === 'draw') return 'Draw!';
    return result.winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!';
  };

  const getWinnerColor = () => {
    if (result.winner === 'draw') return theme.colors.textMuted;
    return result.winner === 'player1'
      ? theme.colors.player1
      : theme.colors.player2;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onHome}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.md,
            },
          ]}
        >
          <ThemedText
            variant="caption"
            style={[styles.gameName, { color: theme.colors.textMuted }]}
          >
            {gameName}
          </ThemedText>

          <ThemedText
            variant="heading"
            style={[styles.winnerText, { color: getWinnerColor() }]}
          >
            {getWinnerText()}
          </ThemedText>

          {result.score && (
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <ThemedText
                  variant="caption"
                  style={{ color: theme.colors.player1 }}
                >
                  Player 1
                </ThemedText>
                <ThemedText
                  variant="heading"
                  style={{ color: theme.colors.player1 }}
                >
                  {result.score.player1}
                </ThemedText>
              </View>

              <ThemedText variant="body" style={styles.scoreDivider}>
                -
              </ThemedText>

              <View style={styles.scoreItem}>
                <ThemedText
                  variant="caption"
                  style={{ color: theme.colors.player2 }}
                >
                  Player 2
                </ThemedText>
                <ThemedText
                  variant="heading"
                  style={{ color: theme.colors.player2 }}
                >
                  {result.score.player2}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.buttons}>
            <Button
              title="Rematch"
              onPress={onRematch}
              variant="primary"
              size="lg"
            />
            <View style={styles.spacer} />
            <Button
              title="Home"
              onPress={onHome}
              variant="ghost"
              size="md"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    alignItems: 'center',
  },
  gameName: {
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winnerText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreDivider: {
    marginTop: 12,
  },
  buttons: {
    width: '100%',
  },
  spacer: {
    height: 8,
  },
});
