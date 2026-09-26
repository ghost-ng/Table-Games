import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GameShell } from '../../src/components/ui/GameShell';
import { StatusRail } from '../../src/components/ui/StatusRail';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { recordGameResult } from '../../src/storage/scores';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { haptics } from '../../src/utils/haptics';
import { randomInt } from '../../src/utils/random';
import {
  HOME,
  LANE_LENGTH,
  LANE_START,
  PEGS_PER_PLAYER,
  TRACK_LENGTH,
  allInPlayAtHome,
  applyMove,
  createGame,
  getLegalMoves,
  movePath,
  passTurn,
  pegsFinished,
  rollDie,
  seatsForCount,
  startSpace,
  trackPosition,
  type Seat,
  type TroubleMove,
  type TroubleState,
} from '../../src/engines/trouble';
import { getAIMove } from '../../src/ai/trouble-ai';

/** User-facing name (the route/id stays `trouble`). */
const GAME_TITLE = 'Pop & Race';

// ─── Player palette (game-specific; themes only define two player colours) ──

const SEAT_LABELS = ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'] as const;

// ─── Board geometry (fractions of the board's side) ──────────────────────────

const STEP_DEG = 360 / TRACK_LENGTH;
const RING_R = 0.395;
const LANE_R0 = 0.315;
const LANE_GAP = 0.058;
const HOME_R = 0.575;
const HOME_SPREAD = 0.037;
const HOME_PAD = 0.155;
const SPACE_D = 0.066;
const PEG_D = 0.056;
const DOME_R = 0.1;
const HOME_OFFSETS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

// Timing (ms)
const STEP_MS = 120;
const TUMBLE_MS = 650;
const AI_ROLL_DELAY = 750;
const AI_MOVE_DELAY = 650;
const AUTO_MOVE_DELAY = 550;
const NO_MOVE_DELAY = 1200;

interface Pt {
  x: number;
  y: number;
}

/** Point at `deg` clockwise from straight up, `r` from the centre. */
function polar(deg: number, r: number): Pt {
  const a = (deg * Math.PI) / 180;
  return { x: 0.5 + r * Math.sin(a), y: 0.5 - r * Math.cos(a) };
}
/** Each seat owns a corner: red top-left, blue top-right, green bottom-right, yellow bottom-left. */
const cornerAngle = (seat: Seat) => -45 + 90 * seat;
/** Track spaces sit around a ring; each seat's start space is half a step clockwise of its corner. */
const trackPoint = (pos: number) => polar(-45 + STEP_DEG / 2 + STEP_DEG * pos, RING_R);
/** Finish lanes run diagonally from the corner toward the centre. */
const lanePoint = (seat: Seat, slot: number) => polar(cornerAngle(seat), LANE_R0 - slot * LANE_GAP);
const homeCenter = (seat: Seat) => polar(cornerAngle(seat), HOME_R);
function homePoint(seat: Seat, peg: number): Pt {
  const c = homeCenter(seat);
  const [dx, dy] = HOME_OFFSETS[peg];
  return { x: c.x + dx * HOME_SPREAD, y: c.y + dy * HOME_SPREAD };
}
function pegPoint(seat: Seat, peg: number, progress: number): Pt {
  if (progress === HOME) return homePoint(seat, peg);
  if (progress >= LANE_START) return lanePoint(seat, progress - LANE_START);
  return trackPoint(trackPosition(seat, progress) ?? 0);
}

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

const cryptoRng = () => (randomInt(6) - 1) / 6;

type Phase = 'setup' | 'ready' | 'rolling' | 'choosing' | 'moving' | 'over';
type Tone = 'info' | 'good' | 'bad';

// ─── Peg ─────────────────────────────────────────────────────────────────────

interface PegProps {
  left: number;
  top: number;
  size: number;
  color: string;
  ringColor: string;
  highlighted: boolean;
  selected: boolean;
  lifted: boolean;
  onPress?: () => void;
  label: string;
  marker: string;
}

function Peg({ left, top, size, color, ringColor, highlighted, selected, lifted, onPress, label, marker }: PegProps) {
  const { theme } = useTheme();
  const x = useSharedValue(left);
  const y = useSharedValue(top);
  const pulse = useSharedValue(1);

  useEffect(() => {
    x.value = withTiming(left, { duration: STEP_MS - 20, easing: Easing.out(Easing.quad) });
    y.value = withTiming(top, { duration: STEP_MS - 20, easing: Easing.out(Easing.quad) });
  }, [left, top]);

  useEffect(() => {
    if (highlighted) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.18, { duration: 420 }), withTiming(1, { duration: 420 })),
        -1,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 120 });
    }
  }, [highlighted]);

  const posStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const ring = size * 1.45;
  return (
    <Animated.View
      pointerEvents={onPress ? 'box-none' : 'none'}
      style={[
        { position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: lifted ? 6 : highlighted ? 4 : 3 },
        posStyle,
      ]}
    >
      {highlighted && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: (size - ring) / 2,
              top: (size - ring) / 2,
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderWidth: selected ? 3 : 2,
              borderColor: ringColor,
            },
            ringStyle,
          ]}
        />
      )}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        hitSlop={Math.max(size * 0.35, (44 - size) / 2)}
        accessibilityState={{ selected, disabled: !onPress }}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={label}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: Math.max(1, size * 0.08),
          borderColor: theme.colors.text,
          transform: [{ scale: lifted ? 1.15 : 1 }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: size * 0.18,
            top: size * 0.14,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: theme.colors.surfaceRaised,
            opacity: 0.45,
          }}
        />
        <ThemedText variant="caption" style={{ color: theme.colors.text, backgroundColor: theme.colors.surfaceRaised, borderRadius: size / 2, paddingHorizontal: 2, fontSize: Math.max(7, size * 0.45), fontWeight: '700' }}>{marker}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

// ─── Die face ────────────────────────────────────────────────────────────────

function DieFace({ value, size, bg, pip, border }: { value: number; size: number; bg: string; pip: string; border: string }) {
  const pipD = size * 0.18;
  const cell = (size * 0.78) / 3;
  const pad = size * 0.11;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        backgroundColor: bg,
        borderWidth: 1.5,
        borderColor: border,
      }}
    >
      {(PIPS[value] ?? []).map(([c, r], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: pad + c * cell + (cell - pipD) / 2 - 1.5,
            top: pad + r * cell + (cell - pipD) / 2 - 1.5,
            width: pipD,
            height: pipD,
            borderRadius: pipD / 2,
            backgroundColor: pip,
          }}
        />
      ))}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TroubleScreen() {
  const { theme } = useTheme();
  const SEAT_COLORS = [theme.colors.player1, theme.colors.player2, theme.colors.success, theme.colors.warning];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { contentMaxWidth, isLandscape, height } = useResponsive();
  const sideBySide = isLandscape && height < 560;
  const { onLayout: onBoardAreaLayout, size: fittedBoardSize } = useBoardFit({ inset: 8, minSize: 180, maxSize: 640 });
  // Switching between stacked and side layouts can retain the previous fit for one frame.
  const S = sideBySide ? Math.min(fittedBoardSize, height - 96, contentMaxWidth - 280) : fittedBoardSize;

  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const isSingle = modeParam !== 'multiplayer';

  // Setup
  const [opponents, setOpponents] = useState(1);
  const [playerCount, setPlayerCount] = useState(2);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Game
  const [phase, setPhase] = useState<Phase>('setup');
  const [game, setGame] = useState<TroubleState>(() => createGame(2));
  const [dieValue, setDieValue] = useState(6);
  const [legal, setLegal] = useState<TroubleMove[]>([]);
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [moving, setMoving] = useState<{ player: number; peg: number; progress: number } | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: Tone } | null>(null);

  // Refs mirror state for timer callbacks.
  const gameRef = useRef(game);
  const phaseRef = useRef<Phase>('setup');
  const rollRef = useRef(0);
  const difficultyRef = useRef<Difficulty>(difficulty);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const tumbleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  const tumble = useSharedValue(0);
  const domeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tumble.value * 360}deg` }, { scale: 1 - Math.sin(tumble.value * Math.PI) * 0.18 }],
  }));

  const isHuman = useCallback((idx: number) => !isSingle || idx === 0, [isSingle]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    if (tumbleRef.current) clearInterval(tumbleRef.current);
    tumbleRef.current = null;
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const commitGame = useCallback((g: TroubleState) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  const showMessage = useCallback((text: string, tone: Tone, ms = 1600) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage({ text, tone });
    messageTimer.current = setTimeout(() => setMessage(null), ms);
  }, []);

  const playerName = useCallback(
    (idx: number, g: TroubleState = gameRef.current) => {
      const seat = g.players[idx]?.seat ?? 0;
      if (isSingle) return idx === 0 ? 'You' : `${SEAT_LABELS[seat]} AI`;
      return `Player ${idx + 1}`;
    },
    [isSingle],
  );

  // ─── Start / restart ──────────────────────────────────────────────────────

  const startGame = useCallback(
    (count: number) => {
      clearTimers();
      commitGame(createGame(count));
      setLegal([]);
      setSelectedPeg(null);
      setMoving(null);
      setMessage(null);
      setDieValue(6);
      recordedRef.current = false;
      startTimeRef.current = Date.now();
      goPhase('ready');
    },
    [clearTimers, commitGame, goPhase],
  );

  const totalPlayers = isSingle ? opponents + 1 : playerCount;

  // ─── Moving a peg ─────────────────────────────────────────────────────────

  const executeMove = useCallback(
    (move: TroubleMove) => {
      if (phaseRef.current !== 'choosing' && phaseRef.current !== 'rolling') return;
      const roll = rollRef.current;
      goPhase('moving');
      setLegal([]);
      setSelectedPeg(null);
      haptics.light();

      const path = movePath(move);
      path.forEach((progress, i) => {
        later(() => setMoving({ player: move.player, peg: move.peg, progress }), i * STEP_MS);
      });

      later(() => {
        const before = gameRef.current;
        const next = applyMove(before, move, roll);
        setMoving(null);
        commitGame(next);

        if (move.capture) {
          haptics.heavy();
          const victim = playerName(move.capture.player, before);
          showMessage(`Bumped! ${victim === 'You' ? 'You were' : `${victim} was`} sent home`, 'bad', 1800);
        } else if (move.to >= LANE_START && move.from < LANE_START) {
          showMessage('Safe in the finish lane!', 'good');
        }

        if (next.winner !== null) {
          haptics.success();
          goPhase('over');
          return;
        }
        if (roll === 6 && !move.capture) showMessage('Rolled a 6 — roll again!', 'good');
        goPhase('ready');
      }, path.length * STEP_MS + 60);
    },
    [commitGame, goPhase, later, playerName, showMessage],
  );

  // ─── Rolling ──────────────────────────────────────────────────────────────

  const doRoll = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const g = gameRef.current;
    if (g.winner !== null) return;
    goPhase('rolling');
    setSelectedPeg(null);
    haptics.medium();

    tumble.value = 0;
    tumble.value = withTiming(1, { duration: TUMBLE_MS, easing: Easing.out(Easing.cubic) });
    if (tumbleRef.current) clearInterval(tumbleRef.current);
    tumbleRef.current = setInterval(() => setDieValue(randomInt(6)), 80);

    later(() => {
      if (tumbleRef.current) clearInterval(tumbleRef.current);
      tumbleRef.current = null;
      const roll = rollDie(cryptoRng);
      rollRef.current = roll;
      setDieValue(roll);

      const current = g.current;
      const moves = getLegalMoves(g, roll);

      if (moves.length === 0) {
        const player = g.players[current];
        showMessage(
          allInPlayAtHome(player) && roll !== 6 ? `Rolled ${roll} — need a 6 to leave home` : 'No moves',
          'info',
          NO_MOVE_DELAY,
        );
        later(() => {
          commitGame(passTurn(gameRef.current, roll));
          if (roll === 6) showMessage('Rolled a 6 — roll again!', 'good');
          goPhase('ready');
        }, NO_MOVE_DELAY);
        goPhase('moving'); // blocks input during the pause
        return;
      }

      setLegal(moves);
      goPhase('choosing');

      if (!isHuman(current)) {
        const aiMove = getAIMove(g, roll, difficultyRef.current, Math.random) ?? moves[0];
        setSelectedPeg(aiMove.peg);
        later(() => executeMove(aiMove), AI_MOVE_DELAY);
      } else if (moves.length === 1) {
        setSelectedPeg(moves[0].peg);
        later(() => executeMove(moves[0]), AUTO_MOVE_DELAY);
      }
    }, TUMBLE_MS);
  }, [commitGame, executeMove, goPhase, isHuman, later, showMessage, tumble]);

  // AI turns roll on their own.
  useEffect(() => {
    if (phase !== 'ready' || game.winner !== null || isHuman(game.current)) return;
    const id = setTimeout(doRoll, AI_ROLL_DELAY);
    return () => clearTimeout(id);
  }, [phase, game, isHuman, doRoll]);

  // Keyboard: Space / Enter rolls on web.
  useEffect(() => {
    if (Platform.OS !== 'web' || phase !== 'ready' || !isHuman(game.current)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        doRoll();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, game, isHuman, doRoll]);

  // ─── Peg / destination taps ───────────────────────────────────────────────

  const moveForPeg = useCallback(
    (peg: number): TroubleMove | undefined => {
      const g = gameRef.current;
      const progress = g.players[g.current].pegs[peg];
      return legal.find((m) => m.peg === peg) ?? (progress === HOME ? legal.find((m) => m.from === HOME) : undefined);
    },
    [legal],
  );

  const onPegPress = useCallback(
    (peg: number) => {
      if (phaseRef.current !== 'choosing' || !isHuman(gameRef.current.current)) return;
      const move = moveForPeg(peg);
      if (!move) return;
      if (selectedPeg === move.peg || legal.length === 1) {
        executeMove(move);
      } else {
        haptics.selection();
        setSelectedPeg(move.peg);
      }
    },
    [executeMove, isHuman, legal.length, moveForPeg, selectedPeg],
  );

  const onTargetPress = useCallback(
    (move: TroubleMove) => {
      if (phaseRef.current !== 'choosing' || !isHuman(gameRef.current.current)) return;
      executeMove(move);
    },
    [executeMove, isHuman],
  );

  // ─── Record result once ───────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'over' || game.winner === null || recordedRef.current) return;
    recordedRef.current = true;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (isSingle) {
      recordGameResult({
        game: 'trouble',
        mode: 'single',
        player: 'Player',
        score: pegsFinished(game.players[0]),
        result: game.winner === 0 ? 'win' : 'loss',
        durationSeconds,
      });
    } else {
      // One record per game (like the other games): the winner.
      const winner = game.winner ?? 0;
      recordGameResult({
        game: 'trouble',
        mode: 'multiplayer',
        player: `Player ${winner + 1}`,
        score: pegsFinished(game.players[winner]),
        result: 'win',
        durationSeconds,
      });
    }
  }, [phase, game, isSingle]);

  // ─── Setup screen ─────────────────────────────────────────────────────────

  const container = [
    styles.container,
    {
      backgroundColor: theme.colors.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      maxWidth: contentMaxWidth,
    },
  ];

  const setupAction = phase !== 'setup' ? <Button title="Setup" size="sm" variant="secondary" onPress={() => { clearTimers(); goPhase('setup'); }} /> : undefined;

  if (phase === 'setup') {
    const options = isSingle ? [1, 2, 3] : [2, 3, 4];
    const chosen = isSingle ? opponents : playerCount;
    const previewSeats = seatsForCount(totalPlayers);
    return (
      <GameShell title={GAME_TITLE} onBack={() => router.back()}>
        <ScrollView style={{ alignSelf: 'stretch' }} contentContainerStyle={styles.setupContent}>
          <ThemedText variant="heading" style={styles.setupTitle}>
            {isSingle ? 'How many opponents?' : 'How many players?'}
          </ThemedText>
          <View style={styles.segmentRow}>
            {options.map((n) => {
              const active = n === chosen;
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    haptics.selection();
                    if (isSingle) setOpponents(n);
                    else setPlayerCount(n);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${n} ${isSingle ? 'opponents' : 'players'}`}
                  style={[
                    styles.segment,
                    {
                      borderRadius: theme.borderRadius.md,
                      borderColor: theme.colors.primary,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceRaised,
                    },
                  ]}
                >
                  <ThemedText variant="heading" style={{ color: active ? theme.colors.onPrimary : theme.colors.text, fontSize: 22 }}>
                    {n}{active ? ' ✓' : ''}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.previewRow}>
            {previewSeats.map((seat, i) => (
              <View key={seat} style={styles.previewItem}>
                <View style={[styles.previewDot, { backgroundColor: theme.colors.surfaceRaised, borderWidth: 2, borderColor: SEAT_COLORS[seat], width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }]}><ThemedText variant="caption" style={{ fontWeight: '700' }}>{seat + 1}</ThemedText></View>
                <ThemedText variant="caption" style={{ color: theme.colors.textMuted }}>
                  {isSingle ? (i === 0 ? 'You' : `${SEAT_LABELS[seat]} AI`) : `P${i + 1} ${SEAT_LABELS[seat]}`}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.setupButton}>
            <Button
              title={isSingle ? 'Choose Difficulty' : 'Start Game'}
              onPress={() => (isSingle ? setShowDifficulty(true) : startGame(playerCount))}
              variant="primary"
              size="lg"
            />
          </View>

          <View
            style={[
              styles.rulesCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md },
            ]}
          >
            {[
              'Tap the dome to roll. Roll a 6 to move a peg out of home — and a 6 always rolls again.',
              'Move one peg clockwise. Land on an opponent to send it home. You can’t land on your own peg.',
              'After a full lap, pegs turn into your finish lane. Land exactly, and no jumping inside the lane.',
              'First to get all four pegs into the finish lane wins.',
            ].map((line) => (
              <ThemedText key={line} variant="caption" style={{ color: theme.colors.textMuted, marginBottom: 4 }}>
                • {line}
              </ThemedText>
            ))}
          </View>
        </ScrollView>

        <DifficultySelector
          visible={showDifficulty}
          onSelect={(d) => {
            setDifficulty(d);
            difficultyRef.current = d;
            setShowDifficulty(false);
            startGame(opponents + 1);
          }}
          onClose={() => setShowDifficulty(false)}
          gameName={GAME_TITLE}
        />
      </GameShell>
    );
  }

  // ─── Play screen ──────────────────────────────────────────────────────────

  const current = game.players[game.current];
  const currentSeat = current.seat;
  const humanTurn = isHuman(game.current);
  const ringColor = theme.colors.accent && theme.colors.accent.startsWith('#') ? theme.colors.accent : theme.colors.text;
  const canRoll = phase === 'ready' && humanTurn && game.winner === null;
  const selectedMove = selectedPeg !== null ? legal.find((m) => m.peg === selectedPeg) : undefined;

  let bannerText: string;
  if (game.winner !== null) bannerText = `${playerName(game.winner)} ${isSingle && game.winner === 0 ? 'win' : 'wins'}!`;
  else if (isSingle) bannerText = game.current === 0 ? 'Your turn' : `${playerName(game.current)}’s turn`;
  else bannerText = `Player ${game.current + 1}’s turn · ${SEAT_LABELS[currentSeat]}`;

  let hint = '';
  if (game.winner === null) {
    if (!humanTurn) {
      hint =
        phase === 'choosing' || phase === 'moving'
          ? `${playerName(game.current)} rolled ${dieValue}`
          : `${playerName(game.current)} is rolling…`;
    } else if (phase === 'ready') {
      hint = allInPlayAtHome(current) ? 'Roll a 6 to leave home — tap the dome' : 'Tap the dome to roll';
    } else if (phase === 'rolling') {
      hint = 'Rolling…';
    } else if (phase === 'choosing') {
      hint = legal.length === 1 ? `Rolled ${dieValue} — moving…` : `Rolled ${dieValue} — tap a glowing peg or its landing spot`;
    }
  }
  const statusText = message?.text ?? hint;
  const statusColor =
    message?.tone === 'bad' ? theme.colors.error : message?.tone === 'good' ? theme.colors.success : theme.colors.textMuted;

  const spaceD = S * SPACE_D;
  const pegD = S * PEG_D;
  const domeD = S * DOME_R * 2;
  const at = (p: Pt, d: number) => ({ position: 'absolute' as const, left: p.x * S - d / 2, top: p.y * S - d / 2, width: d, height: d });

  const board = (
    <View style={styles.boardArea} onLayout={onBoardAreaLayout}>
      <View
        style={{
          width: S,
          height: S,
          backgroundColor: theme.colors.board,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.md,
        }}
      >
        {/* Home pads */}
        {game.players.map((p) => {
          const c = homeCenter(p.seat);
          const pad = S * HOME_PAD;
          return (
            <View
              key={`pad-${p.seat}`}
              style={[
                at(c, pad),
                {
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: SEAT_COLORS[p.seat] + '22',
                  borderWidth: 1.5,
                  borderColor: SEAT_COLORS[p.seat] + '88',
                },
              ]}
            />
          );
        })}
        {game.players.flatMap((p) =>
          Array.from({ length: PEGS_PER_PLAYER }, (_, i) => (
            <View
              key={`hs-${p.seat}-${i}`}
              style={[at(homePoint(p.seat, i), pegD * 0.7), { borderRadius: pegD, backgroundColor: SEAT_COLORS[p.seat] + '33' }]}
            />
          )),
        )}

        {/* Track */}
        {Array.from({ length: TRACK_LENGTH }, (_, pos) => {
          const startSeat = ([0, 1, 2, 3] as Seat[]).find((s) => startSpace(s) === pos);
          const active = startSeat !== undefined && game.players.some((p) => p.seat === startSeat);
          return (
            <View
              key={`t-${pos}`}
              style={[
                at(trackPoint(pos), spaceD),
                {
                  borderRadius: spaceD / 2,
                  backgroundColor: active ? SEAT_COLORS[startSeat!] + '55' : theme.colors.background,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? SEAT_COLORS[startSeat!] : theme.colors.border,
                },
              ]}
            />
          );
        })}

        {/* Finish lanes */}
        {game.players.flatMap((p) =>
          Array.from({ length: LANE_LENGTH }, (_, slot) => (
            <View
              key={`l-${p.seat}-${slot}`}
              style={[
                at(lanePoint(p.seat, slot), spaceD * 0.9),
                {
                  borderRadius: spaceD,
                  backgroundColor: SEAT_COLORS[p.seat] + '30',
                  borderWidth: 1.5,
                  borderColor: SEAT_COLORS[p.seat] + 'AA',
                },
              ]}
            />
          )),
        )}

        {/* Landing spots for the current roll */}
        {phase === 'choosing' &&
          legal.map((m) => {
            const isSel = selectedMove ? selectedMove === m : legal.length === 1;
            const d = spaceD * 1.12;
            return (
              <Pressable
                key={`dest-${m.peg}`}
                onPress={() => onTargetPress(m)}
                disabled={!humanTurn}
                accessibilityRole="button"
                  accessibilityLabel={`Move peg ${m.peg + 1} to landing spot`}
                  hitSlop={Math.max(0, (44 - d) / 2)}
                style={[
                  at(pegPoint(currentSeat, m.peg, m.to), d),
                  {
                    zIndex: 2,
                    borderRadius: d / 2,
                    borderWidth: isSel ? 3 : 2,
                    borderStyle: isSel ? 'solid' : 'dashed',
                    borderColor: m.capture ? theme.colors.error : SEAT_COLORS[currentSeat],
                    backgroundColor: isSel ? SEAT_COLORS[currentSeat] + '55' : 'transparent',
                  },
                ]}
              />
            );
          })}

        {/* Pop dome with the die */}
        <Pressable
          onPress={doRoll}
          disabled={!canRoll}
          accessibilityRole="button"
          accessibilityLabel={`Roll the die${canRoll ? '' : ' (not available)'}, showing ${dieValue}`}
          style={[
            at({ x: 0.5, y: 0.5 }, domeD),
            {
              zIndex: 1,
              borderRadius: domeD / 2,
              backgroundColor: SEAT_COLORS[currentSeat] + (canRoll ? '40' : '1F'),
              borderWidth: canRoll ? 3 : 2,
              borderColor: canRoll ? SEAT_COLORS[currentSeat] : theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              ...(canRoll ? theme.shadows.sm : {}),
            },
          ]}
        >
          <Animated.View style={domeStyle}>
            <DieFace
              value={dieValue}
              size={domeD * 0.52}
              bg={theme.colors.surface}
              pip={theme.colors.text}
              border={theme.colors.border}
            />
          </Animated.View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: domeD * 0.18,
              top: domeD * 0.1,
              width: domeD * 0.34,
              height: domeD * 0.2,
              borderRadius: domeD * 0.2,
              backgroundColor: theme.colors.surfaceRaised,
              opacity: 0.3,
              transform: [{ rotate: '-30deg' }],
            }}
          />
        </Pressable>

        {/* Pegs */}
        {game.players.flatMap((p, pi) =>
          p.pegs.map((progress, peg) => {
            const isMoving = moving !== null && moving.player === pi && moving.peg === peg;
            const shown = isMoving ? moving!.progress : progress;
            const pt = pegPoint(p.seat, peg, shown);
            const isTurnPlayer = pi === game.current && phase === 'choosing';
            const move = isTurnPlayer ? legal.find((m) => m.peg === peg) : undefined;
            const movable = !!move;
            return (
              <Peg
                key={`peg-${p.seat}-${peg}`}
                left={pt.x * S - pegD / 2}
                top={pt.y * S - pegD / 2}
                size={pegD}
                color={SEAT_COLORS[p.seat]}
                ringColor={ringColor}
                highlighted={movable && (humanTurn || selectedPeg === peg)}
                selected={movable && selectedPeg === peg}
                lifted={isMoving}
                onPress={movable && humanTurn ? () => onPegPress(peg) : undefined}
                marker={String(p.seat + 1)}
                label={`${playerName(pi)}, ${SEAT_LABELS[p.seat]} peg ${peg + 1}${movable ? ', legal move' : ''}`}
              />
            );
          }),
        )}
      </View>
    </View>
  );

  const banner = (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: 2,
          borderColor: SEAT_COLORS[game.players[game.winner ?? game.current].seat],
          borderRadius: theme.borderRadius.md,
        },
      ]}
    >
      <ThemedText variant="label" style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>
        {bannerText}
      </ThemedText>
      {isSingle && game.winner === null && (
        <ThemedText variant="caption" style={{ color: theme.colors.textMuted }}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </ThemedText>
      )}
    </View>
  );

  const status = (
    <View style={styles.statusRow}>
      {statusText !== '' && (
        <Animated.View key={statusText} entering={FadeIn.duration(150)}>
          <ThemedText
            variant="label"
            style={{ color: statusColor, textAlign: 'center', fontWeight: message ? '700' : '500' }}
            numberOfLines={2}
          >
            {statusText}
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );

  const scoreboard = (
    <View style={[styles.scoreboard, sideBySide && styles.scoreboardColumn]}>
      {game.players.map((p, i) => {
        const active = i === game.current && game.winner === null;
        return (
          <View
            key={p.seat}
            style={[
              styles.scoreItem,
              {
                borderRadius: theme.borderRadius.sm,
                borderColor: active ? SEAT_COLORS[p.seat] : 'transparent',
                backgroundColor: active ? SEAT_COLORS[p.seat] + '1A' : 'transparent',
              },
            ]}
          >
            <View style={[styles.scoreDot, { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1.5, borderColor: SEAT_COLORS[p.seat], alignItems: 'center', justifyContent: 'center' }]}><ThemedText variant="caption" style={{ fontSize: 10, fontWeight: '700' }}>{p.seat + 1}</ThemedText></View>
            <ThemedText variant="caption" style={{ color: theme.colors.text }} numberOfLines={1}>
              {active ? '▸ ' : ''}{playerName(i)} {pegsFinished(p)}/{PEGS_PER_PLAYER} home
            </ThemedText>
          </View>
        );
      })}
    </View>
  );

  const footer =
    phase === 'over' && game.winner !== null ? (
      <Animated.View entering={FadeIn.duration(250)} style={styles.resultPanel}>
        <ThemedText
          variant="heading"
          style={{ color: isSingle ? (game.winner === 0 ? theme.colors.success : theme.colors.error) : theme.colors.text, textAlign: 'center' }}
        >
          {isSingle ? (game.winner === 0 ? 'You win!' : `${playerName(game.winner)} wins`) : `Player ${game.winner + 1} wins!`}
        </ThemedText>
        <View style={styles.resultButtons}>
          <View style={styles.resultButton}>
            <Button title="Home" onPress={() => router.back()} variant="secondary" size="md" />
          </View>
          <View style={styles.resultButton}>
            <Button title="Play Again" onPress={() => startGame(totalPlayers)} variant="primary" size="md" />
          </View>
        </View>
      </Animated.View>
    ) : (
      <View style={styles.bottomButtons}>
        <Button title="Restart" onPress={() => startGame(totalPlayers)} variant="secondary" size="sm" />
      </View>
    );

  if (sideBySide) {
    return (
      <GameShell title={GAME_TITLE} onBack={() => router.back()} trailingAction={setupAction}>
        <View style={styles.sideRow}>
          {board}
          <View style={styles.sidePanel}>
            <StatusRail>{banner}{status}</StatusRail>
            {scoreboard}
            {footer}
          </View>
        </View>
      </GameShell>
    );
  }

  return (
    <GameShell title={GAME_TITLE} onBack={() => router.back()} trailingAction={setupAction} footer={footer} status={<>{banner}{status}</>}>
      {board}
      {scoreboard}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center' as const,
    width: '100%' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  setupContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  setupTitle: {
    textAlign: 'center',
    fontSize: 22,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  segment: {
    width: 64,
    height: 56,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  setupButton: {
    width: '100%',
    maxWidth: 280,
  },
  rulesCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    padding: 14,
  },
  bannerWrap: {
    paddingHorizontal: 16,
  },
  banner: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusRow: {
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardArea: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  scoreboardColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
  },
  scoreDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomButtons: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resultPanel: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 290,
  },
  resultButton: {
    flex: 1,
  },
  sideRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
  },
  sidePanel: {
    width: 250,
    paddingRight: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 4,
  },
});
