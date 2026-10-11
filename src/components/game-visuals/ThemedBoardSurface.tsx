import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getBoardSurfacePresentation } from '../../game-visuals/presentation';

export interface ThemedBoardSurfaceProps extends ViewProps {
  children: React.ReactNode;
}

export function ThemedBoardSurface({ children, style, testID = 'game-board', ...props }: ThemedBoardSurfaceProps) {
  const { theme } = useTheme();
  const { materials } = theme;
  const { highlight, inset, ...surface } = getBoardSurfacePresentation(materials);
  const radius = StyleSheet.flatten(style)?.borderRadius ?? theme.borderRadius.lg;
  return (
    <View {...props} testID={testID} style={[
      {
        backgroundColor: theme.colors.board,
        borderColor: theme.colors.border,
        borderWidth: materials.boardBorderWidth,
        borderRadius: theme.borderRadius.lg,
        ...surface,
      },
      style,
    ]}>
      <View pointerEvents="none" aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }, highlight]} />
      <View pointerEvents="none" aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }, inset]} />
      {children}
    </View>
  );
}
