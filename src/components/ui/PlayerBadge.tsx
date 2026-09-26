import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';

export interface PlayerBadgeProps {
  player: 'player1' | 'player2';
  label?: string;
  size?: 'sm' | 'md';
}

const BADGE_SIZE = {
  sm: 28,
  md: 40,
};

const FONT_SIZE = {
  sm: 11,
  md: 14,
};

export function PlayerBadge({
  player,
  label,
  size = 'md',
}: PlayerBadgeProps) {
  const { theme } = useTheme();

  const badgeDimension = BADGE_SIZE[size];
  const fontSize = FONT_SIZE[size];
  const playerColor =
    player === 'player1' ? theme.colors.player1 : theme.colors.player2;
  const defaultLabel = player === 'player1' ? 'P1' : 'P2';

  return (
    <View accessibilityRole="text" accessibilityLabel={label ?? (player === 'player1' ? 'Player 1' : 'Player 2')} style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            width: badgeDimension,
            height: badgeDimension,
            borderRadius: badgeDimension / 2,
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: playerColor,
            borderWidth: 2,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.badgeText,
            { fontSize, color: theme.colors.text },
          ]}
        >
          {label === undefined ? defaultLabel : label.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      {label && (
        <ThemedText
          variant="caption"
          style={[styles.label, { color: theme.colors.text }]}
        >
          {label}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '500',
  },
});
