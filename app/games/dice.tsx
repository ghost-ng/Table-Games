import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
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
  onPress,
}: {
  value: number;
  sides: DieType;
  size: number;
  held: boolean;
  rolling: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (rolling && !held) {
      wobble.value = withSequence(
        withTiming(-14, { duration: 90 }),
        withTiming(12, { duration: 110 }),
        withTiming(-8, { duration: 110 }),
        withTiming(5, { duration: 110 }),
        withTiming(0, { duration: 120 }),
      );
    }
  }, [rolling, held, wobble]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }, { scale: 1 - Math.abs(wobble.value) / 140 }],
  }));

  const pip = size * 0.16;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`d${sides} showing ${value}${held ? ', held' : ''}`}
    >
      <Animated.View
        style={[
          styles.die,
          {
            width: size,
            height: size,
            borderRadius: size * (sides === 6 ? 0.18 : 0.26),
            backgroundColor: held ? theme.colors.primary + '22' : theme.colors.surface,
            borderColor: held ? theme.colors.primary : theme.colors.border,
            ...theme.shadows.md,
          },
          animatedStyle,
        ]}
      >
        {sides === 6 ? (
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
        {held && (
          <View style={[styles.heldBadge, { backgroundColor: theme.colors.primary }]}>
            <ThemedText variant="caption" style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>
              HELD
            </ThemedText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function DiceScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsive();

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
        140,
        (area.width - 32 - gap * (perRow - 1)) / perRow,
        (area.height - 16 - gap * (rows - 1)) / rows,
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
          Dice
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      {/* Die type */}
      <View style={styles.chips}>
        {DIE_TYPES.map((d) => {
          const active = d === sides;
          return (
            <Pressable
              key={d}
              onPress={() => changeSides(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                },
              ]}
            >
              <ThemedText variant="label" style={{ color: active ? '#FFFFFF' : theme.colors.text, fontWeight: '700' }}>
                d{d}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Count */}
      <View style={styles.countRow}>
        <Pressable
          onPress={() => changeCount(-1)}
          accessibilityLabel="Fewer dice"
          style={[styles.stepper, { borderColor: theme.colors.border, opacity: count <= 1 ? 0.4 : 1 }]}
        >
          <ThemedText variant="heading" style={{ color: theme.colors.text }}>−</ThemedText>
        </Pressable>
        <ThemedText variant="body" style={{ color: theme.colors.text, minWidth: 90, textAlign: 'center' }}>
          {count} {count === 1 ? 'die' : 'dice'}
        </ThemedText>
        <Pressable
          onPress={() => changeCount(1)}
          accessibilityLabel="More dice"
          style={[styles.stepper, { borderColor: theme.colors.border, opacity: count >= MAX_DICE ? 0.4 : 1 }]}
        >
          <ThemedText variant="heading" style={{ color: theme.colors.text }}>+</ThemedText>
        </Pressable>
      </View>

      {/* Dice */}
      <Pressable style={styles.diceArea} onLayout={onAreaLayout} onPress={roll} accessibilityLabel="Roll dice">
        {area.width > 0 && (
          <View style={[styles.diceGrid, { gap, maxWidth: perRow * dieSize + (perRow - 1) * gap }]}>
            {shown.map((v, i) => (
              <Die
                key={i}
                value={v}
                sides={sides}
                size={dieSize}
                held={held[i] && count > 1}
                rolling={rolling}
                onPress={() => toggleHold(i)}
              />
            ))}
          </View>
        )}
      </Pressable>

      {/* Total + hint (fixed height) */}
      <View style={styles.totalRow}>
        {count > 1 && (
          <ThemedText variant="heading" style={{ fontSize: 30, color: theme.colors.text }}>
            {rolling ? '…' : `Total ${total}`}
          </ThemedText>
        )}
        <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center' }}>
          {count > 1
            ? anyHeld
              ? 'Held dice keep their value. Tap to release.'
              : 'Tap a die to hold it between rolls.'
            : 'Tap the die or Roll.'}
        </ThemedText>
      </View>

      <View style={styles.buttonWide}>
        <Button title="Roll" onPress={roll} variant="primary" size="lg" disabled={rolling} />
      </View>

      {/* History */}
      <View style={styles.history}>
        {history.map((r, i) => (
          <ThemedText
            key={r.id}
            variant="caption"
            style={{ color: theme.colors.textMuted, opacity: 1 - i / (HISTORY_LENGTH + 2), textAlign: 'center' }}
          >
            {r.values.length}d{r.sides}: {r.values.join(' + ')}
            {r.values.length > 1 ? ` = ${r.values.reduce((a, b) => a + b, 0)}` : ''}
          </ThemedText>
        ))}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  diceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  die: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heldBadge: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  totalRow: {
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonWide: {
    width: 220,
    marginVertical: 8,
  },
  history: {
    minHeight: 60,
    maxHeight: 120,
    overflow: 'hidden',
    paddingBottom: 12,
    gap: 2,
  },
});
