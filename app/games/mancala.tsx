import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { Button } from '../../src/components/ui/Button';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { haptics } from '../../src/utils/haptics';
import { recordGameResult } from '../../src/storage/scores';
import {
  createGame,
  makeMove,
  isLegalMove,
  ownerOf,
  isStore,
  STORE,
  type GameState,
  type Player,
} from '../../src/engines/mancala';
import { getAIMove } from '../../src/ai/mancala-ai';

// ─── Board geometry (in "units"; one unit = one pit cell) ──────────────────
// Horizontal: stores left/right, pits in two rows. Vertical: stores top/bottom,
// pits in two columns (the horizontal board rotated 90° clockwise, so sowing
// still runs counter-clockwise on screen).
const LONG = 8.4; // 6 pits + 2 stores + 0.2 padding each end
const SHORT = 2.6; // 2 rows + 0.3 padding each side

const STEP_MS = 130; // per sown seed
const AI_DELAY_MS = 600;
const FEEDBACK_MS = 1400;
const MAX_DOTS = 12;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cellRect(index: number, vertical: boolean): Rect {
  if (vertical) {
    if (index === STORE.player2) return { x: 0.3, y: 0.2, w: 2, h: 1 };
    if (index === STORE.player1) return { x: 0.3, y: 7.2, w: 2, h: 1 };
    if (index < 6) return { x: 0.3, y: 1.2 + index, w: 1, h: 1 };
    return { x: 1.3, y: 1.2 + (12 - index), w: 1, h: 1 };
  }
  if (index === STORE.player2) return { x: 0.2, y: 0.3, w: 1, h: 2 };
  if (index === STORE.player1) return { x: 7.2, y: 0.3, w: 1, h: 2 };
  if (index < 6) return { x: 1.2 + index, y: 1.3, w: 1, h: 1 };
  return { x: 1.2 + (12 - index), y: 0.3, w: 1, h: 1 };
}

// Seeds sit evenly on a ring near the rim, keeping the centre clear for the count.
function ringPoint(k: number, n: number) {
  const a = -Math.PI / 2 + (k * 2 * Math.PI) / Math.max(n, 1);
  return { x: 0.68 * Math.cos(a), y: 0.68 * Math.sin(a) };
}

// ─── Seed dots ──────────────────────────────────────────────────────────────

function SeedDots({
  count,
  width,
  height,
  dot,
  colors,
}: {
  count: number;
  width: number;
  height: number;
  dot: number;
  colors: string[];
}) {
  const n = Math.min(count, MAX_DOTS);
  const rx = Math.max(0, width / 2 - dot);
  const ry = Math.max(0, height / 2 - dot);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: n }, (_, k) => {
        const p = ringPoint(k, n);
        return (
          <View
            key={k}
            style={{
              position: 'absolute',
              left: width / 2 + p.x * rx - dot / 2,
              top: height / 2 + p.y * ry - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: colors[k % colors.length],
              opacity: 0.9,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

interface Feedback {
  id: number;
  text: string;
  color: string;
}

export default function MancalaScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { contentMaxWidth, height: windowHeight } = useResponsive();

  // Short screens (phone landscape): fold the Rematch button into the header.
  const compact = windowHeight < 520;

  // Two fits for the same area — pick one based on the area's shape.
  const fitH = useBoardFit({ aspectRatio: SHORT / LONG, maxSize: 700, inset: 8, minSize: 160 });
  const fitV = useBoardFit({ aspectRatio: LONG / SHORT, maxSize: 260, inset: 8, minSize: 90 });
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const onBoardAreaLayout = useCallback(
    (e: LayoutChangeEvent) => {
      fitH.onLayout(e);
      fitV.onLayout(e);
      const { width, height } = e.nativeEvent.layout;
      setArea((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    },
    [fitH.onLayout, fitV.onLayout]
  );
  const vertical = area ? area.height > area.width : windowHeight > contentMaxWidth;
  const boardW = vertical ? fitV.size : fitH.size;
  const unit = boardW / (vertical ? SHORT : LONG);
  const boardH = unit * (vertical ? LONG : SHORT);

  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const mode: 'single' | 'multiplayer' = modeParam === 'multiplayer' ? 'multiplayer' : 'single';

  const [showDifficultySelector, setShowDifficultySelector] = useState(mode === 'single');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<GameState>(createGame);
  const [displayPits, setDisplayPits] = useState<number[] | null>(null);
  const [animating, setAnimating] = useState(false);
  const [sourcePit, setSourcePit] = useState<number | null>(null);
  const [lastSown, setLastSown] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const feedbackId = useRef(0);
  const recorded = useRef(false);
  const startTime = useRef(Date.now());

  const playerNames = useMemo(
    () =>
      mode === 'single'
        ? { player1: 'You', player2: 'AI' }
        : { player1: 'Player 1', player2: 'Player 2' },
    [mode]
  );

  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const showFeedback = useCallback(
    (text: string, color: string) => {
      const id = ++feedbackId.current;
      setFeedback({ id, text, color });
      schedule(() => setFeedback((f) => (f && f.id === id ? null : f)), FEEDBACK_MS);
    },
    [schedule]
  );

  // ─── Play a move with seed-by-seed animation ─────────────────────────────

  const playMove = useCallback(
    (pit: number) => {
      const before = stateRef.current;
      const result = makeMove(before, pit);
      if (!result) return;

      const mover = before.currentPlayer;
      const frame = before.pits.slice();
      frame[pit] = 0;
      setAnimating(true);
      setSourcePit(pit);
      setLastSown(null);
      setDisplayPits(frame.slice());
      haptics.light();

      result.path.forEach((idx, k) => {
        schedule(() => {
          frame[idx]++;
          setDisplayPits(frame.slice());
          setLastSown(idx);
        }, STEP_MS * (k + 1));
      });

      const special = result.capture || result.sweep;
      schedule(() => {
        setGameState(result.state);
        setDisplayPits(null);
        setSourcePit(null);
        setAnimating(false);
        setLastSown(result.capture ? null : result.path[result.path.length - 1] ?? null);

        const name = playerNames[mover];
        if (result.capture) {
          haptics.medium();
          showFeedback(
            `Capture! ${mode === 'single' ? (mover === 'player1' ? 'You take' : 'AI takes') : `${name} takes`} ${result.capture.seeds}`,
            theme.colors[mover]
          );
        } else if (result.extraTurn) {
          haptics.selection();
          showFeedback(
            mode === 'single' && mover === 'player2' ? 'AI gets an extra turn' : `Extra turn${mode === 'multiplayer' ? ` for ${name}` : ''}!`,
            theme.colors[mover]
          );
        }
        if (result.sweep) {
          const swept = result.sweep.player1 + result.sweep.player2;
          if (swept > 0 && !result.capture) {
            showFeedback('Side empty. Remaining seeds go to their owners.', theme.colors.textMuted);
          }
        }
      }, STEP_MS * result.path.length + (special ? 300 : 120));
    },
    [schedule, showFeedback, playerNames, mode, theme.colors]
  );

  // ─── Game over: record once ──────────────────────────────────────────────

  useEffect(() => {
    if (!gameState.isGameOver || recorded.current) return;
    recorded.current = true;
    const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
    const s1 = gameState.pits[STORE.player1];
    const s2 = gameState.pits[STORE.player2];
    const w = gameState.winner;

    if (mode === 'single') {
      haptics[w === 'player1' ? 'success' : w === 'player2' ? 'error' : 'medium']();
      recordGameResult({
        game: 'mancala',
        mode: 'single',
        player: 'Player 1',
        score: s1,
        result: w === 'player1' ? 'win' : w === 'player2' ? 'loss' : 'draw',
        durationSeconds,
      });
    } else {
      haptics.success();
      recordGameResult({
        game: 'mancala',
        mode: 'multiplayer',
        player: w === 'player2' ? 'Player 2' : 'Player 1',
        score: w === 'player2' ? s2 : s1,
        result: w === 'draw' ? 'draw' : 'win',
        durationSeconds,
      });
    }
    schedule(() => setShowGameOver(true), 900);
  }, [gameState, mode, schedule]);

  // ─── AI turn ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      mode !== 'single' ||
      showDifficultySelector ||
      animating ||
      gameState.isGameOver ||
      gameState.currentPlayer !== 'player2'
    ) {
      return;
    }
    setAiThinking(true);
    const id = setTimeout(() => {
      const move = getAIMove(stateRef.current, difficulty);
      setAiThinking(false);
      if (move >= 0) playMove(move);
    }, AI_DELAY_MS);
    return () => {
      clearTimeout(id);
      setAiThinking(false);
    };
  }, [gameState, animating, mode, difficulty, showDifficultySelector, playMove]);

  // ─── Controls ────────────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    clearTimers();
    setGameState(createGame());
    setDisplayPits(null);
    setAnimating(false);
    setSourcePit(null);
    setLastSown(null);
    setFeedback(null);
    setShowGameOver(false);
    recorded.current = false;
    startTime.current = Date.now();
  }, [clearTimers]);

  const canInteract =
    !animating &&
    !aiThinking &&
    !gameState.isGameOver &&
    !(mode === 'single' && gameState.currentPlayer === 'player2');

  const handlePitPress = useCallback(
    (pit: number) => {
      if (!canInteract || !isLegalMove(gameState, pit)) return;
      playMove(pit);
    },
    [canInteract, gameState, playMove]
  );

  // ─── Difficulty selector ─────────────────────────────────────────────────

  if (showDifficultySelector) {
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
        <DifficultySelector
          visible={showDifficultySelector}
          onSelect={(d) => {
            setDifficulty(d);
            setShowDifficultySelector(false);
            resetGame();
          }}
          onClose={() => router.back()}
          gameName="Mancala"
        />
      </View>
    );
  }

  // ─── Board rendering ─────────────────────────────────────────────────────

  const pits = displayPits ?? gameState.pits;
  const seedColors = [theme.colors.secondary, theme.colors.primary, theme.colors.textMuted];
  const countFont = Math.max(11, Math.round(unit * 0.28));
  const dotSize = Math.max(5, unit * 0.12);

  const renderStore = (player: Player) => {
    const index = STORE[player];
    const r = cellRect(index, vertical);
    const pad = unit * 0.06;
    const w = r.w * unit - pad * 2;
    const h = r.h * unit - pad * 2;
    const color = theme.colors[player];
    const active = !gameState.isGameOver && gameState.currentPlayer === player;
    const highlight = lastSown === index;
    return (
      <View
        key={`store-${player}`}
        accessibilityLabel={`${playerNames[player]} store, ${pits[index]} seeds`}
        style={{
          position: 'absolute',
          left: r.x * unit + pad,
          top: r.y * unit + pad,
          width: w,
          height: h,
          borderRadius: Math.min(w, h) / 2,
          backgroundColor: theme.colors.background,
          borderWidth: active ? 3 : 2,
          borderColor: highlight ? theme.colors.text : color,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: active ? 0.22 : 0.12 }]} />
        <SeedDots count={pits[index]} width={w} height={h} dot={dotSize} colors={seedColors} />
        <View style={{ alignItems: 'center', flexDirection: vertical ? 'row' : 'column', gap: vertical ? 8 : 2 }}>
          <ThemedText
            variant="label"
            numberOfLines={1}
            style={{ color, fontWeight: '700', fontSize: Math.max(11, Math.round(unit * 0.2)) }}
          >
            {vertical ? playerNames[player] : player === 'player1' ? (mode === 'single' ? 'You' : 'P1') : mode === 'single' ? 'AI' : 'P2'}
          </ThemedText>
          <ThemedText
            variant="heading"
            style={{ fontSize: Math.max(16, Math.round(unit * 0.42)), color: theme.colors.text }}
          >
            {pits[index]}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderPit = (index: number) => {
    const r = cellRect(index, vertical);
    const owner = ownerOf(index);
    const color = theme.colors[owner];
    const d = unit * 0.84;
    const legal = canInteract && isLegalMove(gameState, index);
    const isSource = sourcePit === index;
    const isLast = lastSown === index;
    return (
      <Pressable
        key={`pit-${index}`}
        onPress={() => handlePitPress(index)}
        disabled={!legal}
        accessibilityRole="button"
        accessibilityLabel={`${playerNames[owner]} pit ${owner === 'player1' ? index + 1 : index - 6}, ${pits[index]} seeds`}
        style={{
          position: 'absolute',
          left: r.x * unit,
          top: r.y * unit,
          width: unit,
          height: unit,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: theme.colors.background,
            borderWidth: legal || isLast || isSource ? 3 : 1.5,
            borderColor: isLast ? theme.colors.text : legal || isSource ? color : theme.colors.border,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: legal ? 0.28 : 0.1 }]} />
          <SeedDots count={pits[index]} width={d} height={d} dot={dotSize} colors={seedColors} />
          <ThemedText
            variant="label"
            style={{
              fontSize: countFont,
              fontWeight: '700',
              color: pits[index] === 0 ? theme.colors.textMuted : theme.colors.text,
              textShadowColor: theme.colors.background,
              textShadowRadius: 3,
              textShadowOffset: { width: 0, height: 0 },
            }}
          >
            {pits[index]}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  // ─── Status text (row height is always reserved) ─────────────────────────

  let status: { key: string; text: string; color: string } | null = null;
  if (feedback) status = { key: `fb-${feedback.id}`, text: feedback.text, color: feedback.color };
  else if (aiThinking) status = { key: 'ai', text: 'AI is thinking...', color: theme.colors.textMuted };

  const s1 = gameState.pits[STORE.player1];
  const s2 = gameState.pits[STORE.player2];

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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerSide}>
          <ThemedText variant="body" style={{ color: theme.colors.primary }}>
            Back
          </ThemedText>
        </Pressable>
        <View style={styles.titleWrap}>
          <ThemedText variant="heading" style={styles.title} numberOfLines={1}>
            Mancala
          </ThemedText>
          {compact && mode === 'single' && (
            <ThemedText variant="caption" style={{ color: theme.colors.textMuted }}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </ThemedText>
          )}
        </View>
        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          {compact && (
            <Pressable onPress={resetGame} hitSlop={8}>
              <ThemedText variant="body" style={{ color: theme.colors.primary }}>
                Rematch
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Turn indicator (keeps its height at game end so the board doesn't jump) */}
      <View style={styles.turnRow}>
        {!gameState.isGameOver ? (
          <TurnIndicator currentPlayer={gameState.currentPlayer} playerNames={playerNames} />
        ) : (
          <ThemedText variant="label" style={{ color: theme.colors.text }}>
            {gameState.winner === 'draw'
              ? `Draw, ${s1}–${s2}`
              : `${playerNames[gameState.winner as Player]} ${
                  playerNames[gameState.winner as Player] === 'You' ? 'win' : 'wins'
                } ${Math.max(s1, s2)}–${Math.min(s1, s2)}`}
          </ThemedText>
        )}
      </View>
      {!compact && mode === 'single' && (
        <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
          Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </ThemedText>
      )}

      {/* Board */}
      <View style={styles.boardArea} onLayout={onBoardAreaLayout}>
        <View
          style={{
            width: boardW,
            height: boardH,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.md,
          }}
        >
          {renderStore('player2')}
          {renderStore('player1')}
          {Array.from({ length: 14 }, (_, i) => i)
            .filter((i) => !isStore(i))
            .map(renderPit)}
        </View>
      </View>

      {/* Status row: Extra turn / Capture / AI thinking (height always reserved) */}
      <View style={styles.statusRow}>
        {status && (
          <Animated.View key={status.key} entering={FadeIn.duration(150)}>
            <ThemedText variant="label" style={{ color: status.color, fontWeight: '700', textAlign: 'center' }}>
              {status.text}
            </ThemedText>
          </Animated.View>
        )}
      </View>

      {!compact && (
        <View style={styles.bottomButtons}>
          <Button title="Rematch" onPress={resetGame} variant="secondary" size="md" />
        </View>
      )}

      <GameOverModal
        visible={showGameOver}
        result={{
          winner: gameState.winner ?? 'draw',
          score: { player1: s1, player2: s2 },
        }}
        onRematch={resetGame}
        onHome={() => router.back()}
        gameName="Mancala"
        playerNames={playerNames}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'center' as const,
    width: '100%' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    height: 48,
  },
  headerSide: {
    width: 80,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  turnRow: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    minHeight: 28,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  bottomButtons: {
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
});
