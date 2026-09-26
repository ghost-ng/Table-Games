import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeProvider';
import { usePwa } from '../../pwa/usePwa';

const DISMISSED_KEY = 'pwa_install_banner_dismissed';

/**
 * Bottom banner on the home screen offering to install the app, or to
 * restart into a freshly downloaded version. Renders nothing on native.
 */
export function PwaBanner() {
  const { theme } = useTheme();
  const { canInstall, showIosInstallHint, updateReady, install, applyUpdate } = usePwa();
  const [installDismissed, setInstallDismissed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => setInstallDismissed(value === 'true'))
      .catch(() => setInstallDismissed(false));
  }, []);

  const dismissInstall = () => {
    setInstallDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, 'true').catch(() => {});
  };

  let message: string;
  let action: { label: string; onPress: () => void } | null = null;
  let onDismiss: (() => void) | null = null;

  if (updateReady) {
    message = 'A new version of Table Games is ready.';
    action = { label: 'Restart', onPress: applyUpdate };
  } else if (canInstall && !installDismissed) {
    message = 'Install Table Games to play offline from your home screen.';
    action = { label: 'Install', onPress: install };
    onDismiss = dismissInstall;
  } else if (showIosInstallHint && !installDismissed) {
    message = 'To install, tap Share, then “Add to Home Screen”.';
    onDismiss = dismissInstall;
  } else {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
        },
      ]}
    >
      <Text
        style={[styles.message, { color: theme.colors.text, fontFamily: theme.fonts.body }]}
      >
        {message}
      </Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          style={[
            styles.action,
            { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md },
          ]}
        >
          <Text style={[styles.actionLabel, { fontFamily: theme.fonts.body }]}>{action.label}</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
          <Text style={[styles.dismiss, { color: theme.colors.textMuted }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontSize: 13,
  },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dismiss: {
    fontSize: 16,
    paddingHorizontal: 2,
  },
});
