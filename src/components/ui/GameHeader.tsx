import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useWebFocusRing } from '../../utils/useWebFocusRing';
import { ThemedText } from './ThemedText';

export interface GameHeaderProps {
  title: string;
  onBack: () => void;
  trailingAction?: ReactNode;
}

export function GameHeader({ title, onBack, trailingAction }: GameHeaderProps) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        hitSlop={4}
        style={({ pressed }) => [styles.back, { borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surfaceRaised, opacity: pressed ? 0.75 : 1 }, focus.style]}
      >
        <View accessible={false} style={styles.arrow}>
          <View style={[styles.arrowStem, { backgroundColor: theme.colors.text }]} />
          <View style={[styles.arrowHead, { borderColor: theme.colors.text }]} />
        </View>
      </Pressable>
      <ThemedText accessibilityRole="header" variant="heading" style={styles.title}>{title}</ThemedText>
      {trailingAction != null ? <View style={styles.trailing}>{trailingAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8, borderBottomWidth: 1 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 20, height: 20, justifyContent: 'center' },
  arrowStem: { height: 2, width: 18 },
  arrowHead: { position: 'absolute', left: 1, width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
  title: { flex: 1, flexShrink: 1, fontSize: 20 },
  trailing: { flexShrink: 0 },
});
