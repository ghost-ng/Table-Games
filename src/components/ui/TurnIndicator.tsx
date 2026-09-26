import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';

export interface TurnIndicatorProps {
  currentPlayer: 'player1' | 'player2';
  playerNames?: {
    player1: string;
    player2: string;
  };
}

export function TurnIndicator({
  currentPlayer,
  playerNames = { player1: 'Player 1', player2: 'Player 2' },
}: TurnIndicatorProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(currentPlayer === 'player1' ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(currentPlayer === 'player1' ? 0 : 1, {
      duration: theme.animation.duration.medium,
    });
  }, [currentPlayer, theme.animation.duration.medium]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.player1, theme.colors.player2]
    );
    return { backgroundColor };
  });

  const displayName = playerNames[currentPlayer];
  const label = displayName === 'You' ? 'Your Turn' : `${displayName}'s Turn`;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <ThemedText variant="label" style={styles.text}>
        {label}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
