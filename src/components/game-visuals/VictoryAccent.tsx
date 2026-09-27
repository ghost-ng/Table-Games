import React from 'react';
import { Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { getMotionPreset, getVictoryPresentation, type VictoryAccentKind } from '../../game-visuals/presentation';

export interface VictoryAccentProps {
  visible: boolean;
  kind: VictoryAccentKind;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function VictoryAccent({ visible, kind, size = 28, style }: VictoryAccentProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const presentation = getVictoryPresentation(visible, kind);
  if (!presentation) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      entering={reducedMotion ? undefined : FadeIn.duration(getMotionPreset('victory', false).duration)}
      style={[
        {
          width: size, height: size, alignItems: 'center', justifyContent: 'center',
          borderRadius: theme.borderRadius.full,
          borderWidth: presentation.ring ? 2 : 0, borderColor: theme.materials.celebration,
        },
        style,
      ]}
    >
      {presentation.glyph && <Text accessible={false} style={{ color: theme.materials.celebration, fontSize: size * 0.8 }}>{presentation.glyph}</Text>}
    </Animated.View>
  );
}
