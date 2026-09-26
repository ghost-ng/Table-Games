import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ThemePickerProps {
  visible: boolean;
  onClose: () => void;
}

const THEME_OPTIONS = [
  {
    id: 'retro' as const,
    name: 'Retro',
    description: 'Chalkboard & hand-drawn',
    colors: ['#F5F0E8', '#4A7C59', '#C75B39', '#8B6914'],
  },
  {
    id: 'arcade' as const,
    name: 'Arcade',
    description: 'Neon & pixel art',
    colors: ['#0A0A1A', '#FF2E8B', '#00E5FF', '#BFFF00'],
  },
  {
    id: 'modern' as const,
    name: 'Modern',
    description: 'Clean & minimal',
    colors: ['#FAFAFA', '#1A56DB', '#6366F1', '#059669'],
  },
];

export function ThemePicker({ visible, onClose }: ThemePickerProps) {
  const { theme, themeName, setTheme } = useTheme();

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
            styles.modal,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, fontFamily: theme.fonts.heading },
            ]}
          >
            Choose your vibe
          </Text>

          {THEME_OPTIONS.map((option) => {
            const isActive = themeName === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setTheme(option.id);
                  onClose();
                }}
                style={[
                  styles.option,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary + '15'
                      : theme.colors.surface,
                    borderColor: isActive
                      ? theme.colors.primary
                      : theme.colors.border,
                    borderRadius: theme.borderRadius.md,
                  },
                ]}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionName,
                      {
                        color: theme.colors.text,
                        fontFamily: theme.fonts.heading,
                      },
                    ]}
                  >
                    {option.name}
                    {isActive ? ' ✓' : ''}
                  </Text>
                  <Text
                    style={[
                      styles.optionDesc,
                      {
                        color: theme.colors.textMuted,
                        fontFamily: theme.fonts.body,
                      },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <View style={styles.colorSwatches}>
                  {option.colors.map((color, i) => (
                    <View
                      key={i}
                      style={[
                        styles.swatch,
                        { backgroundColor: color, borderColor: theme.colors.border },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderWidth: 1,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 12,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
});
