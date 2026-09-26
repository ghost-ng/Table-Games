import React, { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface StatusRailProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function StatusRail({ children, style, accessibilityLabel }: StatusRailProps) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={accessibilityLabel}
      style={[{ minHeight: 56, justifyContent: 'center', padding: 12, marginVertical: 8, backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.borderRadius.md }, style]}
    >
      {children}
    </View>
  );
}
