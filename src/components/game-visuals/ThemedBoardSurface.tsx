import React from 'react';
import { Image, StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface ThemedBoardSurfaceProps extends ViewProps {
  children: React.ReactNode;
}

export function ThemedBoardSurface({ children, style, testID = 'game-board', ...props }: ThemedBoardSurfaceProps) {
  const { theme } = useTheme();
  const { materials } = theme;
  return (
    <View {...props} testID={testID} style={[
      {
        backgroundColor: theme.colors.board,
        borderColor: theme.colors.border,
        borderWidth: materials.boardBorderWidth,
        borderRadius: theme.borderRadius.lg,
        overflow: 'visible',
        shadowColor: materials.glowOpacity > 0 ? materials.glowColor : '#000000',
        shadowOffset: { width: 0, height: materials.glowOpacity > 0 ? 0 : materials.cellDepth },
        shadowOpacity: materials.glowOpacity > 0 ? materials.glowOpacity : materials.pieceShadowOpacity,
        shadowRadius: 4, elevation: materials.cellDepth,
      },
      style,
    ]}>
      {materials.boardTexture && (
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, { borderRadius: theme.borderRadius.lg, overflow: 'hidden' }]}>
          <Image source={materials.boardTexture} resizeMode="repeat" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, { opacity: 0.08 }]} />
        </View>
      )}
      {children}
    </View>
  );
}
