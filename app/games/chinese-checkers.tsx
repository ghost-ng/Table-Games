import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GameShell } from '../../src/components/ui/GameShell';
import { StatusRail } from '../../src/components/ui/StatusRail';
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
  HOLES,
  MOVE_LIMIT,
  PEGS_PER_PLAYER,
  ROW_SPACING,
  applyMove,
  createGame,
  getLegalDestinations,
  pegsInTarget,
  type GameState,
  type Move,
  type Player,
} from '../../src/engines/chinese-checkers';
import { getAIMove } from '../../src/ai/chinese-checkers-ai';

// ─── Board geometry (in units of the hole spacing) ─────────────────────────
//
// Hole centres span 12 units across (lx -6..6) and 16 rows × √3/2 down. The star
// outline is the two big triangles expanded by STAR_MARGIN; an equilateral
// triangle's corners then stick out by 2·m vertically and √3·m horizontally,
// which is the padding the board box needs.

const STAR_MARGIN = 0.42;
const PAD_X = Math.sqrt(3) * STAR_MARGIN;
const PAD_Y = 2 * STAR_MARGIN;
const UNITS_WIDE = 12 + 2 * PAD_X;
const UNITS_TALL = 16 * ROW_SPACING + 2 * PAD_Y;
/** Height ÷ width of the star board (≈ 1.155). */
const STAR_ASPECT = UNITS_TALL / UNITS_WIDE;

const HOP_MS = 150;
const AI_DELAY_MS = 450;
/** Short-landscape phones put the controls beside the board instead of above/below it. */
const SHORT_LANDSCAPE_HEIGHT = 560;

function holeX(i: number, s: number) {
  return (HOLES[i].lx + 6 + PAD_X) * s;
}
function holeY(i: number, s: number) {
  return (HOLES[i].ly + 8 * ROW_SPACING + PAD_Y) * s;
}

/** An equilateral triangle drawn with the border trick, centred on its centroid. */
function Triangle({
  cx,
  cy,
  side,
  pointsUp,
  color,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  side: number;
  pointsUp: boolean;
  color: string;
  opacity?: number;
}) {
  const h = (side * Math.sqrt(3)) / 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - side / 2,
        top: pointsUp ? cy - (2 * h) / 3 : cy - h / 3,
        width: 0,
        height: 0,
        opacity,
        borderLeftWidth: side / 2,
        borderRightWidth: side / 2,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        ...(pointsUp
          ? { borderBottomWidth: h, borderBottomColor: color }
          : { borderTopWidth: h, borderTopColor: color }),
      }}
    />
  );
}

function Peg({ size, color, borderColor }: { size: number; color: string; borderColor: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: Math.max(1, size * 0.06),
        borderColor,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: size * 0.2,
          top: size * 0.14,
          width: size * 0.3,
          height: size * 0.22,
          borderRadius: size * 0.15,
          backgroundColor: theme.colors.surfaceRaised,
          opacity: 0.45,
        }}
      />
    </View>
  );
}

/** A peg travelling along a move path, one hop (or step) every HOP_MS. */
function MovingPeg({
  path,
  s,
  size,
  color,
  borderColor,
}: {
  path: number[];
  s: number;
  size: number;
  color: string;
  borderColor: string;
}) {
  const x = useSharedValue(holeX(path[0], s));
  const y = useSharedValue(holeY(path[0], s));
  const scale = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    const steps = path.slice(1);
    const [firstX, ...restX] = steps.map((p) => withTiming(holeX(p, s), { duration: HOP_MS, easing: ease }));
    const [firstY, ...restY] = steps.map((p) => withTiming(holeY(p, s), { duration: HOP_MS, easing: ease }));
    x.value = withSequence(firstX, ...restX);
    y.value = withSequence(firstY, ...restY);
    const bumps = steps.flatMap(() => [
      withTiming(1.25, { duration: HOP_MS / 2 }),
      withTiming(1, { duration: HOP_MS / 2 }),
    ]);
    const [firstBump, ...restBumps] = bumps;
    scale.value = withSequence(firstBump, ...restBumps);
    // Runs once per mounted move; the parent remounts this for each new move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - size / 2 },
      { translateY: y.value - size / 2 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, zIndex: 30 }, style]}>
      <Peg size={size} color={color} borderColor={borderColor} />
    </Animated.View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function ChineseCheckersScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { contentMaxWidth, height: windowHeight, isLandscape, isTablet } = useResponsive();
  const sideLayout = isLandscape && windowHeight < SHORT_LANDSCAPE_HEIGHT;
  const { onLayout: onBoardAreaLayout, size: boardWidth } = useBoardFit({
    aspectRatio: STAR_ASPECT,
    maxSize: isTablet ? 600 : 560,
    minSize: 180,
    inset: 8,
  });

  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const mode: 'single' | 'multiplayer' = modeParam === 'multiplayer' ? 'multiplayer' : 'single';

  const [showDifficultySelector, setShowDifficultySelector] = useState(mode === 'single');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<GameState>(() => createGame());
  const [selected, setSelected] = useState<number | null>(null);
  const [animating, setAnimating] = useState<{ move: Move; player: Player; id: number } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  const gameStartTime = useRef(Date.now());
  const recorded = useRef(false);
  /** Bumped on reset so stale timers from the previous game do nothing. */
  const generation = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animId = useRef(0);

  const s = boardWidth / UNITS_WIDE;
  const boardHeight = boardWidth * STAR_ASPECT;
  const holeSize = s * 0.5;
  const pegSize = s * 0.78;

  const isAITurn = mode === 'single' && gameState.currentPlayer === 'player2';
  const inputLocked = gameState.isGameOver || animating !== null || isAITurn;

  const destinations = useMemo(
    () => (selected === null ? [] : getLegalDestinations(gameState, selected)),
    [gameState, selected]
  );

  /** setTimeout that is cancelled by a reset/unmount; returns a cancel function. */
  const schedule = useCallback((fn: () => void, ms: number) => {
    const gen = generation.current;
    const t = setTimeout(() => {
      timers.current = timers.current.filter((x) => x !== t);
      if (gen === generation.current) fn();
    }, ms);
    timers.current.push(t);
    return () => {
      clearTimeout(t);
      timers.current = timers.current.filter((x) => x !== t);
    };
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      timers.current.forEach(clearTimeout);
    },
    []
  );

  const resetGame = useCallback(() => {
    generation.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGameState(createGame());
    setSelected(null);
    setAnimating(null);
    setAiThinking(false);
    setShowGameOver(false);
    recorded.current = false;
    gameStartTime.current = Date.now();
  }, []);

  /** Animates `move` hop by hop, then commits it. */
  const playMove = useCallback(
    (state: GameState, move: Move) => {
      const hops = move.path.length - 1;
      setSelected(null);
      setAnimating({ move, player: state.currentPlayer, id: ++animId.current });
      haptics.light();
      schedule(() => {
        const next = applyMove(state, move);
        setGameState(next);
        setAnimating(null);
      }, hops * HOP_MS + 40);
    },
    [schedule]
  );

  // ─── AI turn ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAITurn || gameState.isGameOver || animating || showDifficultySelector) return;
    setAiThinking(true);
    const state = gameState;
    // Cancelled if the effect re-runs (e.g. StrictMode) so the AI only moves once.
    return schedule(() => {
      const move = getAIMove(state, difficulty);
      setAiThinking(false);
      if (move) playMove(state, move);
    }, AI_DELAY_MS);
  }, [isAITurn, gameState, animating, difficulty, showDifficultySelector, schedule, playMove]);

  // ─── Game over ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!gameState.isGameOver || !gameState.winner || recorded.current) return;
    recorded.current = true;
    const durationSeconds = Math.round((Date.now() - gameStartTime.current) / 1000);
    const home1 = pegsInTarget(gameState.board, 'player1');
    const home2 = pegsInTarget(gameState.board, 'player2');
    const winner = gameState.winner;

    if (mode === 'single') {
      recordGameResult({
        game: 'chinese-checkers',
        mode: 'single',
        player: 'Player 1',
        score: home1,
        result: winner === 'draw' ? 'draw' : winner === 'player1' ? 'win' : 'loss',
        durationSeconds,
      });
    } else {
      recordGameResult({
        game: 'chinese-checkers',
        mode: 'multiplayer',
        player: winner === 'player2' ? 'Player 2' : 'Player 1',
        score: winner === 'player2' ? home2 : home1,
        result: winner === 'draw' ? 'draw' : 'win',
        durationSeconds,
      });
    }

    if (winner === 'draw' || (mode === 'single' && winner === 'player2')) haptics.error();
    else haptics.success();
    schedule(() => setShowGameOver(true), 500);
  }, [gameState, mode, schedule]);

  // ─── Input ────────────────────────────────────────────────────────────────

  const handleHolePress = useCallback(
    (i: number) => {
      if (inputLocked) return;
      const occupant = gameState.board[i];
      if (occupant === gameState.currentPlayer) {
        if (selected === i) {
          setSelected(null);
        } else {
          setSelected(i);
          haptics.selection();
        }
        return;
      }
      const move = destinations.find((m) => m.to === i);
      if (move) {
        playMove(gameState, move);
        return;
      }
      setSelected(null);
    },
    [inputLocked, gameState, selected, destinations, playMove]
  );

  const deselect = useCallback(() => setSelected(null), []);

  // ─── Difficulty selector ────────────────────────────────────────────────

  if (showDifficultySelector) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top, maxWidth: contentMaxWidth },
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
          gameName="Chinese Checkers"
        />
      </View>
    );
  }

  // ─── Render pieces ──────────────────────────────────────────────────────

  const playerNames =
    mode === 'single' ? { player1: 'You', player2: 'AI' } : { player1: 'Player 1', player2: 'Player 2' };
  const colorOf = (p: Player) => (p === 'player1' ? theme.colors.player1 : theme.colors.player2);
  const home1 = pegsInTarget(gameState.board, 'player1');
  const home2 = pegsInTarget(gameState.board, 'player2');
  const destSet = new Set(destinations.map((m) => m.to));
  const movingFrom = animating ? animating.move.from : -1;
  const lastMove = animating ? null : gameState.lastMove;
  const center = { x: (6 + PAD_X) * s, y: (8 * ROW_SPACING + PAD_Y) * s };
  const bigSide = 12 * s + 2 * Math.sqrt(3) * STAR_MARGIN * s;
  const smallSide = 3 * s + 2 * Math.sqrt(3) * STAR_MARGIN * s;
  const pegBorder = theme.colors.text;
  const trailThickness = Math.max(2, s * 0.1);

  let statusText = '';
  let statusColor = theme.colors.textMuted;
  if (aiThinking) statusText = 'AI is thinking…';
  else if (!gameState.isGameOver && selected !== null && destinations.length === 0) {
    statusText = "That peg can't move";
    statusColor = theme.colors.error;
  } else if (!gameState.isGameOver && gameState.moveCount >= MOVE_LIMIT - 30) {
    statusText = `${MOVE_LIMIT - gameState.moveCount} moves left: most pegs home wins`;
    statusColor = theme.colors.error;
  } else if (!gameState.isGameOver && gameState.moveCount < 2) {
    statusText = 'Race your pegs to the opposite point';
  }

  const board = (
    <View
      style={{
        width: boardWidth,
        height: boardHeight,
        position: 'relative',
      }}
    >
      {/* Tap outside any hole deselects */}
      <Pressable onPress={deselect} style={StyleSheet.absoluteFill} accessibilityLabel="Board background" />

      {/* Star */}
      {/* Border tone keeps the star visible against the page on every theme. */}
      <Triangle cx={center.x} cy={center.y} side={bigSide} pointsUp color={theme.colors.board} />
      <Triangle cx={center.x} cy={center.y} side={bigSide} pointsUp={false} color={theme.colors.board} />
      {/* Goal triangles: top is player1's target, bottom is player2's */}
      <Triangle
        cx={center.x}
        cy={center.y - 6 * ROW_SPACING * s}
        side={smallSide}
        pointsUp
        color={theme.colors.player1}
        opacity={0.2}
      />
      <Triangle
        cx={center.x}
        cy={center.y + 6 * ROW_SPACING * s}
        side={smallSide}
        pointsUp={false}
        color={theme.colors.player2}
        opacity={0.2}
      />

      {/* Holes */}
      {HOLES.map((h) => (
        <View
          key={`hole-${h.index}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: holeX(h.index, s) - holeSize / 2,
            top: holeY(h.index, s) - holeSize / 2,
            width: holeSize,
            height: holeSize,
            borderRadius: holeSize / 2,
            backgroundColor: theme.colors.surfaceSunken,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
          }}
        />
      ))}

      {/* Last move trail */}
      {lastMove && (
        <>
          {lastMove.path.slice(1).map((to, k) => {
            const from = lastMove.path[k];
            const x1 = holeX(from, s);
            const y1 = holeY(from, s);
            const x2 = holeX(to, s);
            const y2 = holeY(to, s);
            const len = Math.hypot(x2 - x1, y2 - y1);
            return (
              <View
                key={`trail-${k}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: (x1 + x2) / 2 - len / 2,
                  top: (y1 + y2) / 2 - trailThickness / 2,
                  width: len,
                  height: trailThickness,
                  borderRadius: trailThickness / 2,
                  backgroundColor: colorOf(lastMove.player),
                  opacity: 0.45,
                  transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                }}
              />
            );
          })}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: holeX(lastMove.from, s) - pegSize / 2,
              top: holeY(lastMove.from, s) - pegSize / 2,
              width: pegSize,
              height: pegSize,
              borderRadius: pegSize / 2,
              borderWidth: Math.max(1.5, s * 0.07),
              borderColor: colorOf(lastMove.player),
              opacity: 0.6,
            }}
          />
        </>
      )}

      {/* Destination highlights */}
      {destinations.map((m) => (
        <View
          key={`dest-${m.to}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: holeX(m.to, s) - pegSize / 2,
            top: holeY(m.to, s) - pegSize / 2,
            width: pegSize,
            height: pegSize,
            borderRadius: pegSize / 2,
            backgroundColor: theme.colors.surfaceRaised,
            borderWidth: 2,
            borderColor: theme.colors.focus,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Pegs */}
      {HOLES.map((h) => {
        const occupant = gameState.board[h.index];
        if (!occupant || h.index === movingFrom) return null;
        const isSelected = selected === h.index;
        return (
          <View
            key={`peg-${h.index}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: holeX(h.index, s) - pegSize / 2,
              top: holeY(h.index, s) - pegSize / 2,
              width: pegSize,
              height: pegSize,
              zIndex: isSelected ? 10 : 1,
              transform: [{ scale: isSelected ? 1.12 : 1 }],
            }}
          >
            <Peg size={pegSize} color={colorOf(occupant)} borderColor={isSelected ? theme.colors.text : pegBorder} />
            {isSelected && (
              <View
                style={{
                  position: 'absolute',
                  left: -3,
                  top: -3,
                  width: pegSize + 6,
                  height: pegSize + 6,
                  borderRadius: (pegSize + 6) / 2,
                  borderWidth: 2.5,
                  borderColor: theme.colors.primary,
                }}
              />
            )}
          </View>
        );
      })}

      {animating && (
        <MovingPeg
          key={`move-${animating.id}`}
          path={animating.move.path}
          s={s}
          size={pegSize}
          color={colorOf(animating.player)}
          borderColor={pegBorder}
        />
      )}

      {/* Touch targets: each hole owns its full cell (s wide × √3/2·s tall, brick-offset rows) */}
      {HOLES.map((h) => {
        const occupant = gameState.board[h.index];
        const label = destSet.has(h.index)
          ? 'Move here'
          : occupant
            ? `${occupant === 'player1' ? playerNames.player1 : playerNames.player2} peg`
            : 'Empty hole';
        return (
          <Pressable
            key={`hit-${h.index}`}
            onPress={() => handleHolePress(h.index)}
            accessibilityRole="button"
            accessibilityLabel={`${label}, hole ${h.index + 1}`}
            accessibilityState={{ selected: selected === h.index }}
            disabled={inputLocked}
            style={{
              position: 'absolute',
              left: holeX(h.index, s) - s / 2,
              top: holeY(h.index, s) - (ROW_SPACING * s) / 2,
              width: s,
              height: ROW_SPACING * s,
              zIndex: 40,
            }}
          />
        );
      })}
    </View>
  );

  const info = (
    <>
      {gameState.isGameOver ? (
        // Same height as TurnIndicator so the board doesn't resize at the end.
        <View style={[styles.gameOverBar, { backgroundColor: theme.colors.surface }]}>
          <ThemedText variant="label">
            {gameState.winner === 'draw'
              ? 'Draw'
              : `${playerNames[gameState.winner ?? 'player1']} ${
                  playerNames[gameState.winner ?? 'player1'] === 'You' ? 'win' : 'wins'
                }!`}
          </ThemedText>
        </View>
      ) : (
        <TurnIndicator currentPlayer={gameState.currentPlayer} playerNames={playerNames} />
      )}
      <ThemedText
        variant="caption"
        style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}
      >
        {mode === 'single' ? `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} · ` : ''}
        Move {gameState.moveCount}/{MOVE_LIMIT}
      </ThemedText>
      <View style={[styles.countsRow, sideLayout && styles.countsColumn]}>
        {(['player1', 'player2'] as Player[]).map((p) => (
          <View key={p} style={styles.countItem}>
            <View style={[styles.countDot, { backgroundColor: colorOf(p) }]} />
            <ThemedText variant="label" style={{ color: theme.colors.text }}>
              {mode === 'multiplayer' ? (p === 'player1' ? 'P1' : 'P2') : playerNames[p]}: {p === 'player1' ? home1 : home2}/{PEGS_PER_PLAYER} home
            </ThemedText>
          </View>
        ))}
      </View>
    </>
  );

  const status = (
    <View style={styles.statusRow}>
      {statusText !== '' && (
        <ThemedText
          variant="caption"
          numberOfLines={1}
          style={{ color: statusColor, textAlign: 'center', fontWeight: '600' }}
        >
          {statusText}
        </ThemedText>
      )}
    </View>
  );

  const moveControls = <ScrollView horizontal style={{ height: 52, flexGrow: 0, alignSelf: 'stretch' }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>{selected === null ? HOLES.filter((hole) => gameState.board[hole.index] === gameState.currentPlayer).map((hole, index) => <Button key={hole.index} title={`Peg ${index + 1}`} size="sm" variant="secondary" disabled={inputLocked} onPress={() => handleHolePress(hole.index)} />) : <><Button title="Change peg" size="sm" variant="ghost" disabled={inputLocked} onPress={deselect} />{destinations.map((move) => <Button key={move.to} title={`Move to ${move.to + 1}`} size="sm" variant="secondary" disabled={inputLocked} onPress={() => handleHolePress(move.to)} />)}</>}</ScrollView>;

  const rematch = (
    <View style={[styles.bottomButtons, sideLayout && { marginBottom: 8 }]}>
      {moveControls}
      <Button title="Rematch" onPress={resetGame} variant="secondary" size={sideLayout ? 'sm' : 'md'} />
    </View>
  );

  const boardArea = (
    <Pressable style={styles.boardArea} onLayout={onBoardAreaLayout} onPress={deselect} accessible={false}>
      {board}
    </Pressable>
  );

  const gameOverModal = (
    <GameOverModal
      visible={showGameOver}
      result={{ winner: gameState.winner ?? 'draw', score: { player1: home1, player2: home2 } }}
      onRematch={resetGame}
      onHome={() => router.back()}
      gameName="Chinese Checkers"
      playerNames={playerNames}
    />
  );

  return (
    <GameShell title="Chinese Checkers" onBack={() => router.back()} footer={sideLayout ? undefined : rematch} status={sideLayout ? undefined : info}>
      {sideLayout ? <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
        {boardArea}<View style={styles.sidePanel}><StatusRail>{info}</StatusRail>{status}{rematch}</View>
      </View> : <>{boardArea}{status}</>}
      {gameOverModal}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
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
    paddingHorizontal: 8,
    height: 44,
  },
  backButton: {
    width: 56,
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  countsColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  boardArea: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidePanel: {
    width: 240,
    alignItems: 'center',
  },
  gameOverBar: {
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  bottomButtons: {
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
});
