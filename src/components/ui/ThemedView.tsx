import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface ThemedViewProps extends ViewProps {
  variant?: 'screen' | 'surface' | 'card';
}

export function ThemedView({
  variant = 'surface',
  style,
  ...rest
}: ThemedViewProps) {
  const { theme } = useTheme();

  const variantStyles: Record<string, ViewStyle> = {
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    surface: {
      backgroundColor: theme.colors.surface,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.md,
    },
  };

  return <View style={[variantStyles[variant], style]} {...rest} />;
}
