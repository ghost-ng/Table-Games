import React from 'react';
import { Pressable, type ViewStyle, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE_HEIGHT: Record<string, number> = {
  sm: 36,
  md: 44,
  lg: 56,
};

const SIZE_FONT: Record<string, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const SIZE_PADDING: Record<string, number> = {
  sm: 12,
  md: 16,
  lg: 24,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const containerStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  };

  const textStyles: Record<string, TextStyle> = {
    primary: {
      color: '#FFFFFF',
    },
    secondary: {
      color: theme.colors.primary,
    },
    ghost: {
      color: theme.colors.primary,
    },
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        {
          height: SIZE_HEIGHT[size],
          paddingHorizontal: SIZE_PADDING[size],
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        containerStyles[variant],
        animatedStyle,
      ]}
    >
      <ThemedText
        style={[
          {
            fontSize: SIZE_FONT[size],
            fontWeight: '600',
            fontFamily: theme.fonts.body,
          },
          textStyles[variant],
        ]}
      >
        {title}
      </ThemedText>
    </AnimatedPressable>
  );
}
