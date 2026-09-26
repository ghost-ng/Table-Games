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
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            width: badgeDimension,
            height: badgeDimension,
            borderRadius: badgeDimension / 2,
            backgroundColor: playerColor,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.badgeText,
            { fontSize },
          ]}
        >
          {(label ?? defaultLabel).charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      {label && (
        <ThemedText
          variant="caption"
          style={[styles.label, { color: playerColor }]}
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  label: {
    fontWeight: '500',
  },
});
