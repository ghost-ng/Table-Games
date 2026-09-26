import { Modal, View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { Card } from './Card';
import { useWebFocusRing } from '../../utils/useWebFocusRing';

export type Difficulty = 'easy' | 'medium' | 'hard';
export interface DifficultySelectorProps {
  visible: boolean;
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
  gameName: string;
}

const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'Easy', description: 'Relaxed play', color: 'success' },
  { key: 'medium', label: 'Medium', description: 'A fair challenge', color: 'warning' },
  { key: 'hard', label: 'Hard', description: 'No mercy', color: 'error' },
] as const;

function DifficultyOption({ option, onSelect }: { option: (typeof DIFFICULTY_OPTIONS)[number]; onSelect: DifficultySelectorProps['onSelect'] }) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={option.label + ': ' + option.description}
      onPress={() => onSelect(option.key)} onFocus={focus.onFocus} onBlur={focus.onBlur}
      style={({ pressed }) => [styles.option, { backgroundColor: theme.colors.surfaceSunken, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, opacity: pressed ? 0.75 : 1 }, focus.style]}>
      <View style={[styles.marker, { backgroundColor: theme.colors[option.color] }]} />
      <View style={styles.optionText}>
        <ThemedText style={styles.label}>{option.label}</ThemedText>
        <ThemedText style={[styles.description, { color: theme.colors.textMuted }]}>{option.description}</ThemedText>
      </View>
    </Pressable>
  );
}

export function DifficultySelector({ visible, onSelect, onClose, gameName }: DifficultySelectorProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Modal accessibilityLabel={gameName + ' difficulty'} visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} tabIndex={-1} focusable={false} accessible={false} importantForAccessibility="no" />
        <ScrollView contentContainerStyle={styles.scroll} style={styles.scrollView}>
          <View accessibilityViewIsModal>
            <Card style={styles.content}>
              <ThemedText variant="heading" accessibilityRole="header" style={styles.title}>{gameName}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.colors.textMuted }]}>Select difficulty</ThemedText>
              <View style={styles.buttons}>
                {DIFFICULTY_OPTIONS.map((option) => <DifficultyOption key={option.key} option={option} onSelect={onSelect} />)}
                <Button title="Cancel" onPress={onClose} variant="ghost" />
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollView: { width: '100%', maxWidth: 400, flexGrow: 0 },
  scroll: { padding: 4 },
  content: { padding: 24 },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', marginBottom: 24 },
  buttons: { gap: 12 },
  option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderWidth: 1 },
  marker: { width: 8, height: 32, borderRadius: 4 },
  optionText: { flex: 1 },
  label: { fontWeight: '700', fontSize: 18 },
  description: { fontSize: 13, marginTop: 2 },
});
