import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultySelectorProps {
  visible: boolean;
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
  gameName: string;
}

const DIFFICULTY_OPTIONS: {
  key: Difficulty;
  label: string;
  description: string;
  color: string;
}[] = [
  { key: 'easy', label: 'Easy', description: 'Relaxed play', color: '#4CAF50' },
  { key: 'medium', label: 'Medium', description: 'A fair challenge', color: '#FF9800' },
  { key: 'hard', label: 'Hard', description: 'No mercy', color: '#F44336' },
];

export function DifficultySelector({
  visible,
  onSelect,
  onClose,
  gameName,
}: DifficultySelectorProps) {
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
            Select difficulty
          </ThemedText>

          <View style={styles.buttons}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => onSelect(option.key)}
                style={[
                  styles.difficultyButton,
                  {
                    backgroundColor: option.color,
                    borderRadius: theme.borderRadius.md,
                  },
                ]}
              >
                <ThemedText
                  variant="label"
                  style={styles.buttonLabel}
                >
                  {option.label}
                </ThemedText>
                <ThemedText
                  variant="caption"
                  style={styles.buttonDescription}
                >
                  {option.description}
                </ThemedText>
              </Pressable>
            ))}
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
  difficultyButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  buttonDescription: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
  },
});
