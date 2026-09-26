import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { retroTheme } from '../../theme/themes/retro';
import { arcadeTheme } from '../../theme/themes/arcade';
import { modernTheme } from '../../theme/themes/modern';
import { useWebFocusRing } from '../../utils/useWebFocusRing';
import { Card } from './Card';
import { Button } from './Button';

interface ThemePickerProps { visible: boolean; onClose: () => void; }
const THEME_OPTIONS = [
  { id: 'retro', name: 'Retro', description: 'Chalkboard & hand-drawn', preview: retroTheme },
  { id: 'arcade', name: 'Arcade', description: 'Neon & pixel art', preview: arcadeTheme },
  { id: 'modern', name: 'Modern', description: 'Clean & minimal', preview: modernTheme },
] as const;

function ThemeOption({ option, onClose }: { option: (typeof THEME_OPTIONS)[number]; onClose: () => void }) {
  const { theme, themeName, setTheme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  const isActive = themeName === option.id;
  const colors = option.preview.colors;
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={option.name + ': ' + option.description} aria-checked={isActive} accessibilityState={{ checked: isActive }}
      onPress={() => { setTheme(option.id); onClose(); }} onFocus={focus.onFocus} onBlur={focus.onBlur}
      style={({ pressed }) => [styles.option, {
        backgroundColor: isActive ? theme.colors.surfaceRaised : theme.colors.surfaceSunken,
        borderColor: isActive ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.borderRadius.md, opacity: pressed ? 0.75 : 1,
      }, focus.style]}>
      <View style={styles.optionContent}>
        <Text style={[styles.optionName, { color: theme.colors.text, fontFamily: theme.fonts.heading }]}>{option.name}{isActive ? ' ✓' : ''}</Text>
        <Text style={[styles.optionDesc, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{option.description}</Text>
        <View style={styles.colorSwatches} accessible={false}>
          {[colors.background, colors.primary, colors.accent, colors.success].map((color, i) => <View key={i} style={[styles.swatch, { backgroundColor: color, borderColor: theme.colors.border }]} />)}
        </View>
      </View>
    </Pressable>
  );
}

export function ThemePicker({ visible, onClose }: ThemePickerProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <Modal accessibilityLabel="Choose your vibe" visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} tabIndex={-1} focusable={false} accessible={false} importantForAccessibility="no" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
          <View accessibilityViewIsModal>
            <Card style={styles.modal}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.heading }]}>Choose your vibe</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={styles.options}>
                {THEME_OPTIONS.map((option) => <ThemeOption key={option.id} option={option} onClose={onClose} />)}
              </View>
              <Button title="Close" onPress={onClose} variant="ghost" />
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
  modal: { padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  options: { gap: 12 },
  option: { minHeight: 88, padding: 16, borderWidth: 2 },
  optionContent: { flex: 1 },
  optionName: { fontSize: 16, fontWeight: '600' },
  optionDesc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  colorSwatches: { flexDirection: 'row', gap: 6, marginTop: 12 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
});
