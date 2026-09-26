import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeProvider';
import { usePwa } from '../../pwa/usePwa';
import { Button } from './Button';
import { Card } from './Card';

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
    <Card style={styles.container}>
      <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.colors.text, fontFamily: theme.fonts.body }]}>{message}</Text>
      <View style={styles.actions}>
        {action ? <Button title={action.label} onPress={action.onPress} size="sm" /> : null}
        {onDismiss ? <Button title="Dismiss" onPress={onDismiss} variant="ghost" size="sm" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 16, padding: 16, gap: 12 },
  message: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
});
