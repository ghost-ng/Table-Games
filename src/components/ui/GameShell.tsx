import React, { type ReactNode } from 'react';
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useResponsive } from '../../utils/layout';
import { GameHeader } from './GameHeader';
import { StatusRail } from './StatusRail';

export interface GameShellProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
  status?: ReactNode;
  footer?: ReactNode;
  trailingAction?: ReactNode;
  scroll?: boolean;
  contentMaxWidth?: number;
}

export function GameShell({
  title,
  onBack,
  children,
  status,
  footer,
  trailingAction,
  scroll = false,
  contentMaxWidth,
}: GameShellProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  return (
    <ImageBackground
      source={theme.backgroundImage}
      style={[
        styles.background,
        {
          backgroundColor: theme.colors.background,
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      <View style={[styles.canvas, { maxWidth: contentMaxWidth ?? responsive.contentMaxWidth }]}>
        <GameHeader title={title} onBack={onBack} trailingAction={trailingAction} />
        {status !== undefined ? <StatusRail>{status}</StatusRail> : null}
        {scroll ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
        {footer != null ? (
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>{footer}</View>
        ) : null}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  canvas: { flex: 1, minHeight: 0, width: '100%', alignSelf: 'center' },
  content: { flex: 1, minHeight: 0, alignSelf: 'stretch' },
  scrollContent: { flexGrow: 1, paddingVertical: 12 },
  footer: { flexShrink: 0, borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
});
