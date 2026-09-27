import React, { useEffect } from 'react';
import { Image, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { getMotionPreset, getPiecePresentation, type VisualCellState } from '../../game-visuals/presentation';
import { StateMarker } from './StateMarker';

export interface GamePieceImageProps {
  source: ImageSourcePropType;
  size: number;
  state?: VisualCellState;
  pressed?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GamePieceImage({ source, size, state = 'neutral', pressed = false, disabled = false, style }: GamePieceImageProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const presentation = getPiecePresentation(state, pressed, disabled);
  const duration = getMotionPreset('press', reducedMotion).duration;
  const scale = useSharedValue(presentation.scale);
  useEffect(() => {
    scale.value = withTiming(presentation.scale, { duration });
  }, [scale, presentation.scale, duration]);
  const motionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = presentation.marker.victory || state === 'found' ? theme.materials.celebration : theme.colors.focus;
  const glowing = theme.materials.glowOpacity > 0;

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size, height: size, alignItems: 'center', justifyContent: 'center',
          borderRadius: theme.borderRadius.full,
          borderWidth: presentation.marker.shape === 'none' ? 0 : presentation.marker.borderWidth,
          borderColor: color, opacity: presentation.opacity,
          shadowColor: glowing ? theme.materials.glowColor : '#000000',
          shadowOffset: { width: 0, height: glowing ? 0 : theme.materials.cellDepth },
          shadowOpacity: glowing ? theme.materials.glowOpacity : theme.materials.pieceShadowOpacity,
          shadowRadius: glowing ? 4 : 2, elevation: theme.materials.cellDepth,
        },
        style,
        motionStyle,
      ]}
    >
      <Image source={source} resizeMode="contain" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: '100%', height: '100%' }} />
      <StateMarker marker={presentation.marker} color={color} size={Math.max(10, Math.min(18, size * 0.25))} />
    </Animated.View>
  );
}
