import { Modal, View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { Card } from './Card';

export interface ModeSelectorProps {
  visible: boolean;
  onSelect: (mode: 'single' | 'multiplayer') => void;
  onClose: () => void;
  gameName: string;
}

export function ModeSelector({ visible, onSelect, onClose, gameName }: ModeSelectorProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Modal accessibilityLabel={gameName + ' game mode'} visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} tabIndex={-1} focusable={false} accessible={false} importantForAccessibility="no" />
        <ScrollView contentContainerStyle={styles.scroll} style={styles.scrollView}>
          <View accessibilityViewIsModal>
            <Card style={styles.content}>
              <ThemedText variant="heading" accessibilityRole="header" style={styles.title}>{gameName}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.colors.textMuted }]}>Select game mode</ThemedText>
              <View style={styles.buttons}>
                <Button title="1 Player" onPress={() => onSelect('single')} size="lg" />
                <Button title="2 Players" onPress={() => onSelect('multiplayer')} variant="secondary" size="lg" />
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
});
