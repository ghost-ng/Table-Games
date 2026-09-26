import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import { Button } from './Button';

export interface ModeSelectorProps {
  visible: boolean;
  onSelect: (mode: 'single' | 'multiplayer') => void;
  onClose: () => void;
  gameName: string;
}

export function ModeSelector({
  visible,
  onSelect,
  onClose,
  gameName,
}: ModeSelectorProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.md,
            },
          ]}
          onPress={() => {}}
        >
          <ThemedText variant="heading" style={styles.title}>
            {gameName}
          </ThemedText>

          <ThemedText
            variant="body"
            style={[styles.subtitle, { color: theme.colors.textMuted }]}
          >
            Select game mode
          </ThemedText>

          <View style={styles.buttons}>
            <Button
              title="1 Player"
              onPress={() => onSelect('single')}
              variant="primary"
              size="lg"
            />
            <View style={styles.spacer} />
            <Button
              title="2 Players"
              onPress={() => onSelect('multiplayer')}
              variant="secondary"
              size="lg"
            />
          </View>
        </Pressable>
      </Pressable>
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
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    gap: 12,
  },
  spacer: {
    height: 12,
  },
});
