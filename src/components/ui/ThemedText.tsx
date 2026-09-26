import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface ThemedTextProps extends TextProps {
  variant?: 'heading' | 'body' | 'caption' | 'label';
}

export function ThemedText({
  variant = 'body',
  style,
  ...rest
}: ThemedTextProps) {
  const { theme } = useTheme();

  const variantStyles: Record<string, TextStyle> = {
    heading: {
      fontSize: 24,
      fontWeight: '600',
      fontFamily: theme.fonts.heading,
      color: theme.colors.text,
    },
    body: {
      fontSize: 16,
      fontFamily: theme.fonts.body,
      color: theme.colors.text,
    },
    caption: {
      fontSize: 12,
      fontFamily: theme.fonts.body,
      color: theme.colors.textMuted,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: theme.fonts.body,
      color: theme.colors.text,
    },
  };

  return <Text style={[variantStyles[variant], style]} {...rest} />;
}
