import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { GameShell } from '../../src/components/ui/GameShell';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { haptics } from '../../src/utils/haptics';
import { randomInt } from '../../src/utils/random';

type Side = 'H' | 'T';

const FLIP_MS = 1100;
const HISTORY_LENGTH = 30;

export default function CoinFlipScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { isLandscape, height, isDesktop } = useResponsive();
  // Phones on their side: coin on the left, result and controls on the right.
  const sideBySide = isLandscape && height < 560;
  const { onLayout: onCoinAreaLayout, size: coinSize } = useBoardFit({
    maxSize: isDesktop ? 360 : 280,
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
    transform: [{ translateY: reducedMotion ? 0 : -lift.value * coinSize * 0.12 }, { scale: reducedMotion ? 1 : 1 + lift.value * 0.04 }],
  }));
  // Each face carries its own rotation (tails offset by 180°) with its back hidden,
  // which renders correctly on web without needing preserve-3d on the parent.
  const headsStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${reducedMotion ? (result === 'T' ? 180 : 0) : rotation.value}deg` }],
  }));
  const tailsStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${(reducedMotion ? (result === 'T' ? 180 : 0) : rotation.value) + 180}deg` }],
  }));

  const total = counts.H + counts.T;
  let streak = 0;
  for (const side of history) {
    if (side === history[0]) streak += 1;
    else break;
  }

  return (
    <GameShell
      title="Coin Flip"
      onBack={() => router.back()}
      status={
        <View style={styles.status} accessibilityLiveRegion="polite">
          <View>
            <ThemedText variant="heading" style={{ fontSize: 28 }}>
              {flipping ? 'Flipping…' : result === 'H' ? 'Heads!' : result === 'T' ? 'Tails!' : 'Tap to flip'}
            </ThemedText>
            <ThemedText variant="caption" style={{ minHeight: 18 }}>
              {!flipping && streak > 1 ? `${streak} in a row` : ' '}
            </ThemedText>
          </View>
          <ThemedText variant="caption">{total} {total === 1 ? 'flip' : 'flips'}</ThemedText>
        </View>
      }
      footer={
        <View style={styles.buttons}>
          <View style={styles.buttonWide}>
            <Button title="Flip" onPress={flip} size="lg" disabled={flipping} />
          </View>
          <View style={styles.resetSlot}>
            {total > 0 ? <Button title="Reset" onPress={reset} variant="ghost" size="sm" /> : null}
          </View>
        </View>
      }
    >
      <View style={[styles.body, { flexDirection: sideBySide ? 'row' : 'column' }]}>
        <View style={styles.coinArea} onLayout={onCoinAreaLayout}
          accessibilityLabel={flipping ? 'Coin flipping' : result === 'T' ? 'Coin showing Tails' : 'Coin showing Heads'}>
          <Animated.View style={[{ width: coinSize, height: coinSize }, liftStyle]}>
            {(['H', 'T'] as const).map((side) => (
              <Animated.View key={side} style={[StyleSheet.absoluteFill, styles.faceHolder, side === 'H' ? headsStyle : tailsStyle]}>
                <View style={[styles.face, {
                  width: coinSize, height: coinSize, borderRadius: coinSize / 2,
                  borderWidth: Math.max(4, coinSize * 0.025), borderBottomWidth: Math.max(8, coinSize * 0.05),
                  backgroundColor: theme.colors.board, borderColor: theme.colors.boardAlt, ...theme.shadows.md,
                }]}>
                  <View style={[styles.faceInner, {
                    width: coinSize * 0.76, height: coinSize * 0.76, borderRadius: coinSize * 0.38,
                    borderColor: theme.colors.primary,
                  }]}>
                    <ThemedText variant="heading" style={{ fontSize: coinSize * 0.32, lineHeight: coinSize * 0.39, color: theme.colors.primary }}>
                      {side}
                    </ThemedText>
                    <ThemedText variant="label" style={{ fontSize: Math.max(12, coinSize * 0.075), letterSpacing: 2 }}>
                      {side === 'H' ? 'HEADS' : 'TAILS'}
                    </ThemedText>
                  </View>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        </View>
        <View style={[styles.panel, sideBySide && styles.panelSide]}>
          <View accessibilityLabel={`Heads ${counts.H}, Tails ${counts.T}`} style={[styles.tally, {
            backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg,
          }]}>
            {(['H', 'T'] as const).map((side) => (
              <View key={side} style={styles.tallyItem}>
                <ThemedText variant="caption">{side === 'H' ? 'Heads' : 'Tails'}</ThemedText>
                <ThemedText variant="heading" style={{ fontSize: 28 }}>{counts[side]}</ThemedText>
                <ThemedText variant="caption">{total ? `${Math.round((counts[side] / total) * 100)}%` : '–'}</ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.history}>
            {history.map((side, i) => (
              <View key={history.length - i} accessibilityLabel={`${i === 0 ? 'Latest flip' : `Flip ${total - i}`}: ${side === 'H' ? 'Heads' : 'Tails'}`}
                style={[styles.historyChip, { backgroundColor: side === 'H' ? theme.colors.board : theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
                <ThemedText variant="caption" style={{ color: theme.colors.text, fontWeight: '700' }}>{side}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { flex: 1, minHeight: 0, gap: 12 },
  coinArea: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  faceHolder: { backfaceVisibility: 'hidden', alignItems: 'center', justifyContent: 'center' },
  face: { alignItems: 'center', justifyContent: 'center' },
  faceInner: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  panel: { alignItems: 'center', paddingVertical: 8 },
  panelSide: { flex: 1, justifyContent: 'center' },
  tally: { flexDirection: 'row', borderWidth: 1, paddingVertical: 8, width: '100%', maxWidth: 420 },
  tallyItem: { flex: 1, alignItems: 'center' },
  history: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: 4, height: 80, maxWidth: 420, paddingHorizontal: 8 },
  historyChip: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  buttonWide: { flex: 1, maxWidth: 360 },
  resetSlot: { width: 76, height: 44 },
});
