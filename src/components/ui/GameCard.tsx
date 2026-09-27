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
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: theme.materials.boardBorderWidth,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
          opacity: pressed ? 0.8 : 1,
          shadowColor: theme.materials.glowOpacity > 0 ? theme.materials.glowColor : theme.shadows.sm.shadowColor,
          shadowOffset: { width: 0, height: theme.materials.glowOpacity > 0 ? 0 : theme.materials.cellDepth },
          shadowOpacity: theme.materials.glowOpacity > 0 ? theme.materials.glowOpacity / 2 : theme.materials.pieceShadowOpacity,
          shadowRadius: theme.materials.cellDepth * 2,
          elevation: theme.materials.cellDepth,
        },
        isTool ? styles.toolCard : null,
        focus.style,
      ]}
    >
      <Image source={image} style={isTool ? styles.toolImage : [styles.image, { height: (width - theme.materials.boardBorderWidth * 2) * 3 / 4 }]} resizeMode={isTool ? 'contain' : 'cover'} accessible={false} />
      <View style={isTool ? styles.toolLabel : styles.label}>
        <Text style={[styles.name, { color: theme.colors.text, fontFamily: theme.fonts.body }]}>{game.name}</Text>
        {!isTool && subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden', minHeight: 44 },
  image: { width: '100%', aspectRatio: 4 / 3 },
  toolCard: { minHeight: 112, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  toolImage: { width: 48, height: 48 },
  toolLabel: { alignItems: 'center', justifyContent: 'center' },
  label: { paddingHorizontal: 12, paddingVertical: 14, minHeight: 68, justifyContent: 'center' },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});
