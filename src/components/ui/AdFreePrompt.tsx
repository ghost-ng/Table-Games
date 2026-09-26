import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { haptics } from '../../utils/haptics';

export interface AdFreePromptProps {
  visible: boolean;
  onPurchase: () => void;
  onDismiss: () => void;
}

export function AdFreePrompt({ visible, onPurchase, onDismiss }: AdFreePromptProps) {
  const { theme } = useTheme();
  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(300, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePurchase = () => {
    haptics.success();
    onPurchase();
  };

  const handleDismiss = () => {
    haptics.light();
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.lg,
              ...theme.shadows.md,
            },
            cardStyle,
          ]}
        >
          <ThemedText
            variant="heading"
            style={[styles.heading, { fontFamily: theme.fonts.heading }]}
          >
            Like it ad-free?
          </ThemedText>

          <ThemedText
            variant="body"
            style={[styles.body, { color: theme.colors.textMuted }]}
          >
            $2.99, once, forever.
          </ThemedText>

          <View style={styles.buttons}>
            <Button
              title="Remove Ads"
              onPress={handlePurchase}
              variant="primary"
              size="lg"
            />
            <Button
              title="Maybe Later"
              onPress={handleDismiss}
              variant="ghost"
              size="md"
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  heading: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    gap: 8,
  },
});
