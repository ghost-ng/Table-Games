import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';

interface GamePlaceholderProps {
  gameName: string;
}

export function GamePlaceholder({ gameName }: GamePlaceholderProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode: string }>();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.colors.primary, fontFamily: theme.fonts.body }]}>
            ← Back
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontFamily: theme.fonts.heading },
          ]}
        >
          {gameName}
        </Text>
        <Text
          style={[
            styles.mode,
            { color: theme.colors.primary, fontFamily: theme.fonts.body },
          ]}
        >
          {mode === 'multiplayer' ? '2 Players' : '1 Player'}
        </Text>
        <View
          style={[
            styles.placeholder,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.lg,
            },
          ]}
        >
          <Text
            style={[
              styles.placeholderText,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Game coming soon...
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
  },
  mode: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  placeholderText: {
    fontSize: 16,
  },
});
