import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { haptics } from '../../utils/haptics';
import { useWebFocusRing } from '../../utils/useWebFocusRing';

export interface GameCardProps {
  game: { id: string; name: string; emoji: string };
  image: ImageSourcePropType;
  subtitle?: string;
  variant?: 'game' | 'tool';
  onPress: () => void;
  width: number;
}

export function GameCard({ game, image, subtitle, variant = 'game', onPress, width }: GameCardProps) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  const isTool = variant === 'tool';

  return (
    <Pressable
      onPress={() => { haptics.light(); onPress(); }}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityLabel={(isTool ? 'Open ' : 'Play ') + game.name}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: isTool ? theme.colors.surfaceSunken : theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
          opacity: pressed ? 0.8 : 1,
          ...(!isTool ? theme.shadows.sm : {}),
        },
        focus.style,
      ]}
    >
      <Image source={image} style={[styles.image, { height: (width - 2) * 3 / 4 }]} resizeMode="cover" accessible={false} />
      <View style={styles.label}>
        <Text style={[styles.name, { color: theme.colors.text, fontFamily: theme.fonts.body }]}>{game.name}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden', minHeight: 44 },
  image: { width: '100%', aspectRatio: 4 / 3 },
  label: { paddingHorizontal: 12, paddingVertical: 14, minHeight: 68, justifyContent: 'center' },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});
