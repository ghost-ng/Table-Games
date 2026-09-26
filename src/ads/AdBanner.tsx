import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAdFreeStatus } from '../iap/useAdFreeStatus';

/**
 * Mock banner ad component.
 *
 * Renders a 50px themed placeholder when ads should be visible.
 * Returns null when the user is in the ad-free window or has purchased ad-free.
 *
 * Replace the inner View with a real AdMob BannerAd component when you switch
 * to a native build.
 */
export function AdBanner() {
  const { theme } = useTheme();
  const { isAdFree } = useAdFreeStatus();

  if (isAdFree) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.textMuted,
            fontFamily: theme.fonts.body,
          },
        ]}
      >
        Ad Space
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
