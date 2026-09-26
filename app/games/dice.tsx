import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
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
import { useWebFocusRing } from '../../src/utils/useWebFocusRing';
import { useResponsive } from '../../src/utils/layout';
import { haptics } from '../../src/utils/haptics';
import { randomInt } from '../../src/utils/random';

const DIE_TYPES = [4, 6, 8, 10, 12, 20] as const;
type DieType = (typeof DIE_TYPES)[number];
const MAX_DICE = 6;
const ROLL_MS = 600;
const TUMBLE_STEP_MS = 70;
const HISTORY_LENGTH = 8;

// Pip positions on a 3×3 grid (row, col) for each d6 face.
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

interface RollRecord {
  id: number;
  sides: DieType;
  values: number[];
}

function Die({
  value,
  sides,
  size,
  held,
  rolling,
  canHold,
  onPress,
}: {
  value: number;
  sides: DieType;
  size: number;
  held: boolean;
  rolling: boolean;
  canHold: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const wobble = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const focus = useWebFocusRing(theme.colors.focus);

  useEffect(() => {
    if (rolling && !held && !reducedMotion) {
      wobble.value = withSequence(
        withTiming(-14, { duration: 90 }),
        withTiming(12, { duration: 110 }),
        withTiming(-8, { duration: 110 }),
        withTiming(5, { duration: 110 }),
        withTiming(0, { duration: 120 }),
      );
    }
    else wobble.value = 0;
  }, [rolling, held, wobble, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }, { scale: 1 - Math.abs(wobble.value) / 140 }],
  }));

  const pip = size * 0.16;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`d${sides} showing ${rolling && !held ? 'rolling' : value}${held ? ', held, tap to release' : canHold ? ', tap to hold' : ', tap to roll'}`}
      accessibilityState={{ selected: held, disabled: rolling }}
      disabled={rolling}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[{ borderRadius: theme.borderRadius.md }, focus.style]}
    >
      <Animated.View
        style={[
          styles.die,
          {
            width: size,
            height: size,
            borderRadius: size * 0.18,
            borderBottomWidth: 5,
            backgroundColor: held ? theme.colors.board : theme.colors.surfaceRaised,
            borderColor: held ? theme.colors.primary : theme.colors.border,
            ...theme.shadows.md,
          },
          animatedStyle,
        ]}
      >
        {rolling && reducedMotion && !held ? (
          <ThemedText variant="heading" style={{ fontSize: size * 0.3 }}>…</ThemedText>
        ) : sides === 6 ? (
          <View style={{ width: size * 0.7, height: size * 0.7 }}>
            {PIPS[value].map(([r, c], i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: pip,
                  height: pip,
                  borderRadius: pip / 2,
                  backgroundColor: theme.colors.text,
                  top: (r * (size * 0.7 - pip)) / 2,
                  left: (c * (size * 0.7 - pip)) / 2,
                }}
              />
            ))}
          </View>
        ) : (
          <>
            <ThemedText
              variant="heading"
              style={{ fontSize: size * 0.42, lineHeight: size * 0.5, color: theme.colors.text, fontWeight: '800' }}
            >
              {value}
            </ThemedText>
            <ThemedText variant="caption" style={{ fontSize: Math.max(9, size * 0.12), color: theme.colors.textMuted }}>
              d{sides}
            </ThemedText>
          </>
        )}
      </Animated.View>
      <ThemedText variant="caption" style={{ height: 24, lineHeight: 24, textAlign: 'center', fontSize: 11, color: held ? theme.colors.primary : theme.colors.textMuted, fontWeight: held ? '700' : '400' }}>
        {rolling && !held ? 'Rolling…' : `${value}${held ? ' Held' : ''}`}
      </ThemedText>
    </Pressable>
  );
}

export default function DiceScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isLandscape, width, height, isDesktop } = useResponsive();
  const sideBySide = isLandscape && height < 560;

  const [sides, setSides] = useState<DieType>(6);
  const [count, setCount] = useState(2);
  const [values, setValues] = useState<number[]>(() => Array.from({ length: MAX_DICE }, () => randomInt(6)));
  const [held, setHeld] = useState<boolean[]>(() => Array(MAX_DICE).fill(false));
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<RollRecord[]>([]);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const tumbleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollIdRef = useRef(0);

  useEffect(
    () => () => {
      if (tumbleRef.current) clearInterval(tumbleRef.current);
      if (finishRef.current) clearTimeout(finishRef.current);
    },
    [],
  );

  // Die size fills the dice area: up to 3 per row, capped so a single die isn't huge.
  const perRow = count <= 3 ? count : count === 4 ? 2 : 3;
  const rows = Math.ceil(count / perRow);
  const gap = 16;
  const dieSize = Math.floor(
    Math.max(
      44,
      Math.min(
        isDesktop ? 180 : 150,
        (area.width - 32 - gap * (perRow - 1)) / perRow,
        (area.height - 16 - gap * (rows - 1) - rows * 24) / rows,
      ),
    ),
  );

  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const roll = useCallback(() => {
    if (rolling) return;
    const active = held.slice(0, count);
    if (active.every(Boolean)) return;
    setRolling(true);
    haptics.medium();

    // Tumble through random faces, then settle on the real result.
    tumbleRef.current = setInterval(() => {
      setValues((v) => v.map((x, i) => (i < count && !held[i] ? randomInt(sides) : x)));
    }, TUMBLE_STEP_MS);

    // The real result is decided up front; the tumble is only visual. Held dice keep their value.
    const final = values.map((x, i) => (i < count && !held[i] ? randomInt(sides) : x));
    rollIdRef.current += 1;
    const record: RollRecord = { id: rollIdRef.current, sides, values: final.slice(0, count) };

    finishRef.current = setTimeout(() => {
      if (tumbleRef.current) clearInterval(tumbleRef.current);
      setValues(final);
      setHistory((h) => [record, ...h].slice(0, HISTORY_LENGTH));
      setRolling(false);
      haptics.success();
    }, ROLL_MS);
  }, [rolling, held, count, sides, values]);

  const changeSides = (next: DieType) => {
    if (rolling || next === sides) return;
    setSides(next);
    setHeld(Array(MAX_DICE).fill(false));
    setValues(Array.from({ length: MAX_DICE }, () => randomInt(next)));
  };

  const changeCount = (delta: number) => {
    if (rolling) return;
    setCount((c) => Math.min(MAX_DICE, Math.max(1, c + delta)));
  };

  const toggleHold = (i: number) => {
    if (rolling || count === 1) return;
    haptics.selection();
    setHeld((h) => h.map((x, j) => (j === i ? !x : x)));
  };

  const shown = values.slice(0, count);
  const total = shown.reduce((a, b) => a + b, 0);
  const anyHeld = held.slice(0, count).some(Boolean);

  const allHeld = held.slice(0, count).every(Boolean);

  return (
    <GameShell
      title="Dice"
      onBack={() => router.back()}
      status={
        <View style={[styles.status, width < 380 && { flexDirection: 'column', gap: 4 }]} accessibilityLiveRegion="polite">
          <ThemedText variant="heading" style={{ fontSize: 28 }}>{rolling ? 'Rolling…' : `Total ${total}`}</ThemedText>
          <ThemedText variant="caption" style={[styles.hint, width < 380 && { flex: 0, textAlign: 'center' }]}>
            {count > 1 ? anyHeld ? 'Held dice keep their value. Tap to release.' : 'Tap a die to hold it between rolls.' : 'Tap the die or Roll.'}
          </ThemedText>
        </View>
      }
      footer={
        <View style={styles.buttonWide}>
          <Button title="Roll" onPress={roll} size="lg" disabled={rolling || allHeld} />
        </View>
      }
    >
      <View style={[styles.body, { flexDirection: sideBySide ? 'row-reverse' : 'column' }]}>
        <View style={[styles.panel, sideBySide && styles.panelSide]}>
          <View style={styles.chips}>
            {DIE_TYPES.map((d) => {
              const active = d === sides;
              return <DieTypeControl key={d} sides={d} active={active} disabled={rolling} onPress={() => changeSides(d)} />;
            })}
          </View>
          <View style={styles.countRow}>
            <CountControl title="Fewer dice" glyph="−" disabled={count <= 1 || rolling} onPress={() => changeCount(-1)} />
            <ThemedText variant="label" style={{ minWidth: 90, textAlign: 'center' }}>{count} {count === 1 ? 'die' : 'dice'}</ThemedText>
            <CountControl title="More dice" glyph="+" disabled={count >= MAX_DICE || rolling} onPress={() => changeCount(1)} />
          </View>
          {sideBySide ? <View style={styles.history}>{renderHistory()}</View> : null}
        </View>
        <View style={styles.diceArea} onLayout={onAreaLayout}>
          {area.width > 0 ? (
            <View style={[styles.diceGrid, { gap, maxWidth: perRow * dieSize + (perRow - 1) * gap }]}>
              {shown.map((v, i) => <Die key={i} value={v} sides={sides} size={dieSize} held={held[i] && count > 1} rolling={rolling} canHold={count > 1} onPress={() => count === 1 ? roll() : toggleHold(i)} />)}
            </View>
          ) : null}
        </View>
        {!sideBySide ? <View style={styles.history}>{renderHistory()}</View> : null}
      </View>
    </GameShell>
  );

  function renderHistory() {
    return <ScrollView contentContainerStyle={{ gap: 4 }}>
      {history.map((r) => <ThemedText key={r.id} variant="caption" style={{ textAlign: 'center' }}>
        {r.values.length}d{r.sides}: {r.values.join(' + ')}{r.values.length > 1 ? ` = ${r.values.reduce((a, b) => a + b, 0)}` : ''}
      </ThemedText>)}
    </ScrollView>;
  }
}

function DieTypeControl({ sides, active, disabled, onPress }: { sides: DieType; active: boolean; disabled: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  return <Pressable accessibilityRole="button" accessibilityLabel={`d${sides}${active ? ', selected' : ''}`} accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur}
    style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceRaised, borderColor: active ? theme.colors.primary : theme.colors.border, borderRadius: theme.borderRadius.md, opacity: disabled ? 0.5 : 1 }, focus.style]}>
    <ThemedText variant="label" style={{ fontSize: 13, fontWeight: '700', color: active ? theme.colors.onPrimary : theme.colors.text }}>{active ? '✓ ' : ''}d{sides}</ThemedText>
  </Pressable>;
}

function CountControl({ title, glyph, disabled, onPress }: { title: string; glyph: string; disabled: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur}
    style={[styles.stepper, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.borderRadius.md, opacity: disabled ? 0.4 : 1 }, focus.style]}>
    <ThemedText variant="heading" style={{ fontSize: 24 }}>{glyph}</ThemedText>
  </Pressable>;
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  hint: { flex: 1, maxWidth: 260, textAlign: 'right' },
  body: { flex: 1, minHeight: 0, gap: 12 },
  panel: { alignItems: 'center', paddingVertical: 4 },
  panelSide: { flex: 1, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  chip: { borderWidth: 1, minWidth: 44, minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  stepper: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  diceArea: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  diceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  die: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  buttonWide: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  history: { height: 44, width: '100%', maxWidth: 420, marginTop: 8 },
});
