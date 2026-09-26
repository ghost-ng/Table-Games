import React from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useWebFocusRing } from '../../utils/useWebFocusRing';
import { ThemedText } from './ThemedText';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const SIZE_HEIGHT = { sm: 44, md: 44, lg: 56 };
const SIZE_FONT = { sm: 14, md: 16, lg: 18 };
const SIZE_PADDING = { sm: 12, md: 16, lg: 24 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  const containerStyles: Record<NonNullable<ButtonProps['variant']>, ViewStyle> = {
    primary: { backgroundColor: theme.colors.primary, borderWidth: 0 },
    secondary: { backgroundColor: theme.colors.surfaceRaised, borderWidth: 2, borderColor: theme.colors.primary },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: SIZE_HEIGHT[size],
          paddingVertical: 8,
          paddingHorizontal: SIZE_PADDING[size],
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
        containerStyles[variant],
        focus.style,
      ]}
    >
      <ThemedText
        style={{
          fontSize: SIZE_FONT[size],
          fontWeight: '600',
          fontFamily: theme.fonts.body,
          color: variant === 'primary' ? theme.colors.onPrimary : theme.colors.text,
        }}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}
