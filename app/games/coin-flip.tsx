import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { haptics } from '../../src/utils/haptics';
import { randomInt } from '../../src/utils/random';

type Side = 'H' | 'T';

const FLIP_MS = 1100;
const HISTORY_LENGTH = 30;
// A coin is gold on every theme.
const GOLD = '#E7B94C';
const GOLD_EDGE = '#B8862B';
const GOLD_INK = '#6E4B0E';

export default function CoinFlipScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, isLandscape, height } = useResponsive();
  // Phones on their side: coin on the left, result and controls on the right.
  const sideBySide = isLandscape && height < 560;
  const { onLayout: onCoinAreaLayout, size: coinSize } = useBoardFit({
    maxSize: 260,
    minSize: 110,
    inset: 24,
  });

  const [result, setResult] = useState<Side | null>(null);
  const [history, setHistory] = useState<Side[]>([]);
  const [counts, setCounts] = useState({ H: 0, T: 0 });
  const [flipping, setFlipping] = useState(false);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cumulative Y rotation in degrees: 0 mod 360 shows heads, 180 mod 360 shows tails.
  const rotation = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(
    () => () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    },
    [],
  );

  const flip = useCallback(() => {
    if (flipping) return;
    const side: Side = randomInt(2) === 1 ? 'H' : 'T';
    setFlipping(true);
    haptics.light();

    const current = rotation.value;
    const base = Math.ceil(current / 360) * 360 + 360 * 5; // at least five full turns
    const target = base + (side === 'T' ? 180 : 0);
    rotation.value = withTiming(target, { duration: FLIP_MS, easing: Easing.out(Easing.cubic) });
    lift.value = withSequence(
      withTiming(1, { duration: FLIP_MS * 0.45, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: FLIP_MS * 0.55, easing: Easing.bounce }),
    );

    revealTimeoutRef.current = setTimeout(() => {
      setResult(side);
      setHistory((h) => [side, ...h].slice(0, HISTORY_LENGTH));
      setCounts((c) => ({ ...c, [side]: c[side] + 1 }));
      setFlipping(false);
      haptics.success();
    }, FLIP_MS);
  }, [flipping, rotation, lift]);

  const reset = useCallback(() => {
    setHistory([]);
    setCounts({ H: 0, T: 0 });
    setResult(null);
  }, []);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * coinSize * 0.35 }, { scale: 1 + lift.value * 0.15 }],
  }));
  // Each face carries its own rotation (tails offset by 180°) with its back hidden,
  // which renders correctly on web without needing preserve-3d on the parent.
  const headsStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value}deg` }],
  }));
  const tailsStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value + 180}deg` }],
  }));

  const total = counts.H + counts.T;
  let streak = 0;
  for (const side of history) {
    if (side === history[0]) streak += 1;
    else break;
  }

  const resultLine = (
      <View style={styles.resultRow}>
        <ThemedText variant="heading" style={{ fontSize: 28, color: theme.colors.text }}>
          {flipping ? '…' : result === 'H' ? 'Heads!' : result === 'T' ? 'Tails!' : 'Tap to flip'}
        </ThemedText>
        <ThemedText variant="caption" style={{ color: theme.colors.textMuted, minHeight: 18 }}>
          {!flipping && streak > 1 ? `${streak} in a row` : ' '}
        </ThemedText>
      </View>
  );

  const renderFace = (side: Side) => (
    <View
      style={[
        styles.face,
        {
          width: coinSize,
          height: coinSize,
          borderRadius: coinSize / 2,
          borderWidth: Math.max(4, coinSize * 0.045),
        },
      ]}
    >
      <View
        style={[
          styles.faceInner,
          {
            width: coinSize * 0.78,
            height: coinSize * 0.78,
            borderRadius: coinSize * 0.39,
            borderWidth: Math.max(2, coinSize * 0.015),
          },
        ]}
      >
        <ThemedText style={{ fontSize: coinSize * 0.3, lineHeight: coinSize * 0.36, color: GOLD_INK }}>
          {side === 'H' ? '♛' : '★'}
        </ThemedText>
        <ThemedText
          variant="heading"
          style={{ fontSize: coinSize * 0.1, color: GOLD_INK, letterSpacing: 2, fontWeight: '800' }}
        >
          {side === 'H' ? 'HEADS' : 'TAILS'}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          maxWidth: contentMaxWidth,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText variant="body" style={{ color: theme.colors.primary }}>
            Back
          </ThemedText>
        </Pressable>
        <ThemedText variant="heading" style={styles.title}>
          Coin Flip
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.body, { flexDirection: sideBySide ? 'row' : 'column' }]}>
      {!sideBySide && resultLine}

      <Pressable
        style={styles.coinArea}
        onLayout={onCoinAreaLayout}
        onPress={flip}
        accessibilityRole="button"
        accessibilityLabel="Flip coin"
      >
        <Animated.View style={[{ width: coinSize, height: coinSize }, liftStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.faceHolder, headsStyle]}>
            {renderFace('H')}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.faceHolder, tailsStyle]}>
            {renderFace('T')}
          </Animated.View>
        </Animated.View>
      </Pressable>

      <View style={[styles.panel, sideBySide && styles.panelSide]}>
      {sideBySide && resultLine}
      {/* Tally */}
      <View style={[styles.tally, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg }]}>
        {(['H', 'T'] as const).map((side) => (
          <View key={side} style={styles.tallyItem}>
            <ThemedText variant="caption" style={{ color: theme.colors.textMuted }}>
              {side === 'H' ? 'Heads' : 'Tails'}
            </ThemedText>
            <ThemedText variant="heading" style={{ fontSize: 26, color: theme.colors.text }}>
              {counts[side]}
            </ThemedText>
            <ThemedText variant="caption" style={{ color: theme.colors.textMuted }}>
              {total ? `${Math.round((counts[side] / total) * 100)}%` : '–'}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* History, newest first */}
      <View style={styles.history}>
        {history.map((side, i) => (
          <View
            key={history.length - i}
            style={[
              styles.historyChip,
              {
                backgroundColor: side === 'H' ? GOLD : theme.colors.surface,
                borderColor: side === 'H' ? GOLD_EDGE : theme.colors.border,
                opacity: 1 - i / (HISTORY_LENGTH * 1.3),
              },
            ]}
          >
            <ThemedText variant="caption" style={{ color: side === 'H' ? GOLD_INK : theme.colors.text, fontWeight: '700' }}>
              {side}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.buttons}>
        <View style={styles.buttonWide}>
          <Button title="Flip" onPress={flip} variant="primary" size="lg" disabled={flipping} />
        </View>
        {total > 0 && (
          <Button title="Reset" onPress={reset} variant="ghost" size="sm" />
        )}
      </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center' as const,
    width: '100%' as const,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    height: 48,
  },
  backButton: {
    width: 60,
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  body: {
    flex: 1,
    alignSelf: 'stretch',
  },
  panel: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  panelSide: {
    flex: 1,
    justifyContent: 'center',
  },
  resultRow: {
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  coinArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceHolder: {
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    backgroundColor: GOLD,
    borderColor: GOLD_EDGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  faceInner: {
    borderColor: GOLD_EDGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tally: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingVertical: 8,
    width: '90%',
    maxWidth: 360,
  },
  tallyItem: {
    flex: 1,
    alignItems: 'center',
  },
  history: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    marginTop: 10,
    minHeight: 26,
    maxWidth: 420,
  },
  historyChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
    paddingBottom: 16,
    minHeight: 110,
  },
  buttonWide: {
    width: 220,
  },
});
