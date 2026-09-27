import React from 'react';
import { Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useWebFocusRing } from '../../utils/useWebFocusRing';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function Card({ children, onPress, style, disabled = false }: CardProps) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.materials.boardBorderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    shadowColor: theme.materials.glowOpacity > 0 ? theme.materials.glowColor : theme.shadows.md.shadowColor,
    shadowOffset: { width: 0, height: theme.materials.glowOpacity > 0 ? 0 : theme.materials.cellDepth },
    shadowOpacity: theme.materials.glowOpacity > 0 ? theme.materials.glowOpacity / 2 : theme.materials.pieceShadowOpacity,
    shadowRadius: theme.materials.cellDepth * 2,
    elevation: theme.materials.cellDepth,
  };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={({ pressed }) => [cardStyle, style, { minHeight: 44, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }, focus.style]}
      >{children}</Pressable>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}
