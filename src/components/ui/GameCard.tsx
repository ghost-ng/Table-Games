import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { haptics } from '../../utils/haptics';

export interface GameCardProps {
  game: { id: string; name: string; emoji: string };
  onPress: () => void;
  width: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GameCard({ game, onPress, width }: GameCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`Play ${game.name}`}
      accessibilityRole="button"
      style={[
        styles.card,
        {
          width,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
          ...theme.shadows.md,
        },
        animatedStyle,
      ]}
    >
      <Text style={styles.emoji}>{game.emoji}</Text>
      <Text
        style={[
          styles.name,
          {
            color: theme.colors.text,
            fontFamily: theme.fonts.body,
          },
        ]}
        numberOfLines={2}
      >
        {game.name}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 8,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
