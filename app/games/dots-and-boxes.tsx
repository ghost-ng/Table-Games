import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useReducedMotion,
  FadeIn,
} from 'react-native-reanimated';

import { GameShell } from '../../src/components/ui/GameShell';
import { StatusRail } from '../../src/components/ui/StatusRail';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { recordGameResult } from '../../src/storage/scores';
import {
  createGame,
  drawLine,
  isLineDrawn,
  type GameState,
  type Player,
  type LineOrientation,
} from '../../src/engines/dots-and-boxes';
import { getAIMove } from '../../src/ai/dots-and-boxes-ai';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { getMotionPreset } from '../../src/game-visuals/presentation';
import { ThemedBoardSurface } from '../../src/components/game-visuals/ThemedBoardSurface';
import { VictoryAccent } from '../../src/components/game-visuals/VictoryAccent';
import {
  getDotsAndBoxesEdgeKey,
  getDotsAndBoxesGridGeometry,
  resolveNearestOpenEdge,
  SUPPORTED_DOTS_AND_BOXES_GRID_SIZES,
} from '../../src/game-visuals/dotsAndBoxesInput';

const BOARD_SIZE_DESCRIPTIONS: Record<number, string> = {
  3: 'Quick',
  4: 'Classic',
  5: 'Standard',
  6: 'Large',
  8: 'Huge',
  10: 'Epic',
};
const BOARD_SIZE_OPTIONS = SUPPORTED_DOTS_AND_BOXES_GRID_SIZES.map((value) => ({
  label: `${value}×${value}`,
  value,
  description: BOARD_SIZE_DESCRIPTIONS[value],
}));
const DEFAULT_GRID_SIZE = 5;

export default function DotsAndBoxesScreen() {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const placementDuration = getMotionPreset('place', reducedMotion).duration;
  const router = useRouter();
  const { contentMaxWidth, width, height } = useResponsive();
  const shortLandscape = width > height && height < 560;
  const compactPortrait = width <= 430 && width <= height && height <= 720;
  const { onLayout: onBoardAreaLayout, size: boardSize } = useBoardFit({ maxSize: 720, minSize: 132, inset: 12, phoneInset: 0 });

  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [showBoardSizeSelector, setShowBoardSizeSelector] = useState(true);
  const [gameState, setGameState] = useState<GameState>(createGame(DEFAULT_GRID_SIZE));
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showExtraTurn, setShowExtraTurn] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [focusedEdgeKey, setFocusedEdgeKey] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const prevPlayerRef = useRef<Player>('player1');

  const boardGeometry = getDotsAndBoxesGridGeometry(boardSize, gridSize);
  const gridInset = boardGeometry?.inset ?? 0;
  const cellSize = boardGeometry?.cellSize ?? 0;
  const dotSize = Math.max(6, Math.min(10, cellSize * 0.24));
  const lineThickness = gridSize >= 8 ? 4 : 6;

  const handleBoardSizeSelect = useCallback((size: number) => {
    setGridSize(size);
    setShowBoardSizeSelector(false);
    if (resolvedMode === 'single') {
      setShowDifficultySelector(true);
    } else {
      setGameState(createGame(size));
      startTimeRef.current = Date.now();
      prevPlayerRef.current = 'player1';
    }
  }, [resolvedMode]);

  const handleDifficultySelect = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setShowDifficultySelector(false);
    setGameState(createGame(gridSize));
    startTimeRef.current = Date.now();
    prevPlayerRef.current = 'player1';
  }, [gridSize]);

  const handleLinePress = useCallback(
    (orientation: LineOrientation, row: number, col: number) => {
      if (gameState.isGameOver) return;
      if (aiThinking) return;
      if (isLineDrawn(gameState, orientation, row, col)) return;
      if (mode === 'single' && gameState.currentPlayer === 'player2') return;

      const prevPlayer = gameState.currentPlayer;
      const newState = drawLine(gameState, orientation, row, col);
      setGameState(newState);

      // Show extra turn indicator if the same player gets another turn and game is not over
      if (!newState.isGameOver && newState.currentPlayer === prevPlayer) {
        setShowExtraTurn(true);
        setTimeout(() => setShowExtraTurn(false), 1200);
      }

      prevPlayerRef.current = prevPlayer;
    },
    [gameState, aiThinking, mode]
  );

  const boardInputDisabled = aiThinking
    || gameState.isGameOver
    || (mode === 'single' && gameState.currentPlayer === 'player2');
  const occupiedEdgeKeys = useMemo(() => {
    const occupied = new Set<string>();
    gameState.horizontalLines.forEach((row, rowIndex) => {
      row.forEach((owner, colIndex) => {
        if (owner) {
          occupied.add(getDotsAndBoxesEdgeKey({ orientation: 'horizontal', row: rowIndex, col: colIndex }));
        }
      });
    });
    gameState.verticalLines.forEach((row, rowIndex) => {
      row.forEach((owner, colIndex) => {
        if (owner) {
          occupied.add(getDotsAndBoxesEdgeKey({ orientation: 'vertical', row: rowIndex, col: colIndex }));
        }
      });
    });
    return occupied;
  }, [gameState.horizontalLines, gameState.verticalLines]);

  const handleBoardRelease = useCallback((event: GestureResponderEvent) => {
    if (boardInputDisabled) return;
    const edge = resolveNearestOpenEdge(
      { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
      boardSize,
      gridSize,
      occupiedEdgeKeys,
    );
    if (edge) handleLinePress(edge.orientation, edge.row, edge.col);
  }, [boardInputDisabled, boardSize, gridSize, handleLinePress, occupiedEdgeKeys]);

  // AI move — use a ref to avoid stale closures
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    if (mode !== 'single') return;
    if (gameState.isGameOver) return;
    if (gameState.currentPlayer !== 'player2') return;

    setAiThinking(true);

    const makeAIMove = () => {
      const current = gameStateRef.current;
      if (current.isGameOver || current.currentPlayer !== 'player2') {
        setAiThinking(false);
        return;
      }

      const move = getAIMove(current, difficulty);
      const newState = drawLine(current, move.orientation, move.row, move.col);
      setGameState(newState);
      gameStateRef.current = newState;

      if (!newState.isGameOver && newState.currentPlayer === 'player2') {
        // AI gets extra turn — make another move after delay
        setShowExtraTurn(true);
        setTimeout(() => setShowExtraTurn(false), 800);
        setTimeout(makeAIMove, 600);
      } else {
        setAiThinking(false);
      }
    };

    const timeout = setTimeout(makeAIMove, 500);
    return () => clearTimeout(timeout);
  }, [gameState.currentPlayer, gameState.isGameOver, mode, difficulty]);

  // Record game result and show modal when game ends
  useEffect(() => {
    if (!gameState.isGameOver || !mode) return;

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

    if (mode === 'single') {
      const result =
        gameState.winner === 'player1'
          ? 'win'
          : gameState.winner === 'player2'
            ? 'loss'
            : 'draw';

      recordGameResult({
        game: 'dots-and-boxes',
        mode: 'single',
        player: 'Player 1',
        score: gameState.scores.player1,
        result,
        durationSeconds: duration,
      });
    } else {
      recordGameResult({
        game: 'dots-and-boxes',
        mode: 'multiplayer',
        player: gameState.winner === 'draw' ? 'Draw' : gameState.winner === 'player1' ? 'Player 1' : 'Player 2',
        score:
          gameState.winner === 'player1'
            ? gameState.scores.player1
            : gameState.winner === 'player2'
              ? gameState.scores.player2
              : gameState.scores.player1,
        result: gameState.winner === 'draw' ? 'draw' : 'win',
        durationSeconds: duration,
      });
    }

    const timeout = setTimeout(() => setShowGameOver(true), 600);
    return () => clearTimeout(timeout);
  }, [gameState.isGameOver]);

  const handleRematch = useCallback(() => {
    setShowGameOver(false);
    setGameState(createGame(gridSize));
    startTimeRef.current = Date.now();
    prevPlayerRef.current = 'player1';
  }, [gridSize]);

  const handleHome = useCallback(() => {
    setShowGameOver(false);
    router.back();
  }, [router]);

  // Compute dot positions
  const getDotPosition = (row: number, col: number) => ({
    x: gridInset + col * cellSize,
    y: gridInset + row * cellSize,
  });

  const getPlayerColor = (player: Player) =>
    player === 'player1' ? theme.colors.player1 : theme.colors.player2;

  const getPlayerColorAlpha = (player: Player, alpha: number) => {
    const hex = getPlayerColor(player);
    const alphaHex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0');
    return hex + alphaHex;
  };

  if (showBoardSizeSelector) {
    return (
      <GameShell title="Dots & Boxes" onBack={() => router.back()} scroll>
        <View style={styles.sizeSelector}>
          <ThemedText variant="heading" style={{ textAlign: 'center', marginBottom: 4 }}>
            Choose your board
          </ThemedText>
          <ThemedText variant="caption" style={{ textAlign: 'center', color: theme.colors.textMuted, marginBottom: 20 }}>
            Join two dots. Close a box to score and play again.
          </ThemedText>
          {BOARD_SIZE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityLabel={`${opt.label} board, ${opt.description}`}
              onPress={() => handleBoardSizeSelect(opt.value)}
              style={[
                styles.sizeOption,
                {
                  backgroundColor: opt.value === DEFAULT_GRID_SIZE ? theme.colors.primary : theme.colors.surfaceRaised,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                },
              ]}
            >
              <ThemedText
                variant="heading"
                style={{
                  color: opt.value === DEFAULT_GRID_SIZE ? theme.colors.onPrimary : theme.colors.text,
                  fontSize: 18,
                }}
              >
                {opt.label}
              </ThemedText>
              <ThemedText
                variant="caption"
                style={{
                  color: opt.value === DEFAULT_GRID_SIZE ? theme.colors.onPrimary : theme.colors.textMuted,
                }}
              >
                {opt.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </GameShell>
    );
  }

  if (showDifficultySelector) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, maxWidth: contentMaxWidth }]}>
        <DifficultySelector
          visible={showDifficultySelector}
          onSelect={handleDifficultySelect}
          onClose={() => router.back()}
          gameName="Dots & Boxes"
        />
      </View>
    );
  }

  const gameStatus = (<>
      {/* Turn Indicator */}
      {true && (
        <TurnIndicator
          currentPlayer={gameState.currentPlayer}
          playerNames={{
            player1: mode === 'single' ? 'You' : 'Player 1',
            player2: mode === 'single' ? 'AI' : 'Player 2',
          }}
        />
      )}
      {mode === 'single' && (
        <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
          Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </ThemedText>
      )}

      <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center' }}>{gridSize}×{gridSize} dots · Complete a box to play again</ThemedText>
      <ThemedText
        variant="caption"
        accessibilityLiveRegion="polite"
        style={{ minHeight: 20, color: theme.colors.textMuted, textAlign: 'center' }}
      >{showExtraTurn ? 'Extra turn!' : aiThinking ? 'AI is thinking…' : ''}</ThemedText>
      </>);

  const rematch = <Button title="Rematch" onPress={handleRematch} variant="secondary" />;
  const compactRematch = <Button title="Rematch" onPress={handleRematch} variant="secondary" size="sm" />;

  return (
    <GameShell
      title="Dots & Boxes"
      onBack={handleHome}
      trailingAction={compactPortrait ? compactRematch : undefined}
      footer={shortLandscape || compactPortrait ? undefined : rematch}
      status={shortLandscape || compactPortrait ? undefined : gameStatus}
    >
      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, minHeight: 0 }}>

      {/* Score Display */}
      <View style={[styles.scoreContainer, compactPortrait && styles.compactScoreContainer, shortLandscape && { display: 'none' }]}>
        <View style={styles.scoreItem}>
          <View
            style={[styles.scoreDot, { backgroundColor: theme.colors.player1 }]}
          />
          <ThemedText
            variant="body"
            style={[styles.scoreLabel, { color: theme.colors.player1 }]}
          >
            {mode === 'single' ? 'You' : 'P1'}
          </ThemedText>
          <ThemedText
            variant="heading"
            style={[styles.scoreValue, { color: theme.colors.player1 }]}
          >
            {gameState.scores.player1}
          </ThemedText>
        </View>

        <ThemedText variant="body" style={{ color: theme.colors.textMuted }}>
          -
        </ThemedText>

        <View style={styles.scoreItem}>
          <View
            style={[styles.scoreDot, { backgroundColor: theme.colors.player2 }]}
          />
          <ThemedText
            variant="body"
            style={[styles.scoreLabel, { color: theme.colors.player2 }]}
          >
            {mode === 'single' ? 'AI' : 'P2'}
          </ThemedText>
          <ThemedText
            variant="heading"
            style={[styles.scoreValue, { color: theme.colors.player2 }]}
          >
            {gameState.scores.player2}
          </ThemedText>
        </View>
      </View>

      {compactPortrait ? (
        <ThemedText
          variant="caption"
          accessibilityLiveRegion="polite"
          style={[styles.compactStatus, { color: theme.colors.textMuted }]}
        >
          {gameState.currentPlayer === 'player1'
            ? mode === 'single' ? 'Your turn' : 'Player 1 turn'
            : mode === 'single' ? 'AI turn' : 'Player 2 turn'}
          {' · '}{gridSize}×{gridSize} dots
          {showExtraTurn ? ' · Extra turn!' : aiThinking ? ' · Thinking…' : ''}
        </ThemedText>
      ) : null}

      {/* Board */}
      <View style={styles.boardWrapper} onLayout={onBoardAreaLayout}>
        <ThemedBoardSurface
          testID="game-board"
          onStartShouldSetResponder={() => !boardInputDisabled}
          onResponderRelease={handleBoardRelease}
          style={[
            styles.board,
            {
              width: boardSize,
              height: boardSize,
              borderWidth: 0,
              borderRadius: theme.borderRadius.md,
            },
          ]}
        >
          {/* Completed Boxes */}
          {gameState.boxes.map((row, r) =>
            row.map((owner, c) => {
              if (!owner) return null;
              const pos = getDotPosition(r, c);
              return (
                <Animated.View
                  key={`box-${r}-${c}`}
                  pointerEvents="none"
                  entering={reducedMotion ? undefined : FadeIn.duration(placementDuration)}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={`Box row ${r + 1}, column ${c + 1}, claimed by ${owner === 'player1' ? mode === 'single' ? 'You' : 'Player 1' : mode === 'single' ? 'AI' : 'Player 2'}`}
                  style={[
                    styles.boxFill,
                    {
                      left: pos.x,
                      top: pos.y,
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getPlayerColorAlpha(owner, 0.2),
                      borderWidth: 1,
                      borderColor: getPlayerColor(owner),
                      borderRadius: 2,
                    },
                  ]}
                >
                  <ThemedText
                    aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                    variant="caption"
                    style={{
                      color: getPlayerColor(owner),
                      fontSize: cellSize * 0.3,
                      fontWeight: '700',
                    }}
                  >
                    {owner === 'player1'
                      ? mode === 'single'
                        ? 'Y'
                        : '1'
                      : mode === 'single'
                        ? 'A'
                        : '2'}
                    {' ✓'}
                  </ThemedText>
                  <VictoryAccent visible kind="ring" size={cellSize * 0.7} style={{ position: 'absolute' }} />
                </Animated.View>
              );
            })
          )}

          {/* Horizontal Lines (drawn) */}
          {gameState.horizontalLines.map((row, r) =>
            row.map((player, c) => {
              if (!player) return null;
              const startDot = getDotPosition(r, c);
              return (
                <View
                  key={`hline-${r}-${c}`}
                  pointerEvents="none"
                  accessible
                  accessibilityLabel={`Horizontal line, row ${r + 1}, column ${c + 1}, ${player === 'player1' ? 'Player 1' : 'Player 2'}${gameState.lastMove?.orientation === 'horizontal' && gameState.lastMove.row === r && gameState.lastMove.col === c ? ', last edge' : ''}`}
                  style={[
                    styles.drawnLine,
                    {
                      left: startDot.x,
                      top: startDot.y - lineThickness / 2,
                      width: cellSize,
                      height: lineThickness,
                      backgroundColor: getPlayerColor(player),
                      borderRadius: lineThickness / 2,
                    },
                  ]}
                >
                  {gameState.lastMove?.orientation === 'horizontal' && gameState.lastMove.row === r && gameState.lastMove.col === c && (
                    <View pointerEvents="none" aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: cellSize / 2 - 5, top: lineThickness / 2 - 5, width: 10, height: 10, borderWidth: 2, borderColor: theme.colors.text, backgroundColor: theme.colors.surfaceRaised, transform: [{ rotate: '45deg' }] }} />
                  )}
                </View>
              );
            })
          )}

          {/* Vertical Lines (drawn) */}
          {gameState.verticalLines.map((row, r) =>
            row.map((player, c) => {
              if (!player) return null;
              const startDot = getDotPosition(r, c);
              return (
                <View
                  key={`vline-${r}-${c}`}
                  pointerEvents="none"
                  accessible
                  accessibilityLabel={`Vertical line, row ${r + 1}, column ${c + 1}, ${player === 'player1' ? 'Player 1' : 'Player 2'}${gameState.lastMove?.orientation === 'vertical' && gameState.lastMove.row === r && gameState.lastMove.col === c ? ', last edge' : ''}`}
                  style={[
                    styles.drawnLine,
                    {
                      left: startDot.x - lineThickness / 2,
                      top: startDot.y,
                      width: lineThickness,
                      height: cellSize,
                      backgroundColor: getPlayerColor(player),
                      borderRadius: lineThickness / 2,
                    },
                  ]}
                >
                  {gameState.lastMove?.orientation === 'vertical' && gameState.lastMove.row === r && gameState.lastMove.col === c && (
                    <View pointerEvents="none" aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: lineThickness / 2 - 5, top: cellSize / 2 - 5, width: 10, height: 10, borderWidth: 2, borderColor: theme.colors.text, backgroundColor: theme.colors.surfaceRaised, transform: [{ rotate: '45deg' }] }} />
                  )}
                </View>
              );
            })
          )}

          {/* Semantic edge controls. Pointer input is resolved once at board level so
              dense-grid targets never overlap; these thin controls remain available
              to keyboards and assistive technology. */}
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize - 1 }, (_, c) => {
              const drawn = isLineDrawn(gameState, 'horizontal', r, c);
              if (drawn) return null;
              const startDot = getDotPosition(r, c);
              const edgeKey = getDotsAndBoxesEdgeKey({ orientation: 'horizontal', row: r, col: c });
              const focused = focusedEdgeKey === edgeKey;
              return (
                <Pressable
                  key={`htap-${r}-${c}`}
                  pointerEvents="none"
                  accessibilityRole="button"
                  accessibilityLabel={`Horizontal line, row ${r + 1}, column ${c + 1}`}
                  accessibilityState={{ disabled: boardInputDisabled }}
                  disabled={boardInputDisabled}
                  onPress={() => handleLinePress('horizontal', r, c)}
                  onFocus={() => setFocusedEdgeKey(edgeKey)}
                  onBlur={() => setFocusedEdgeKey((current) => current === edgeKey ? null : current)}
                  style={[
                    styles.semanticEdgeControl,
                    {
                      left: startDot.x,
                      top: startDot.y - (focused ? 2 : 1),
                      width: cellSize,
                      height: focused ? 4 : 2,
                      backgroundColor: focused ? theme.colors.primary : theme.colors.border,
                      opacity: focused ? 1 : 0.72,
                    },
                  ]}
                />
              );
            })
          )}

          {Array.from({ length: gridSize - 1 }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const drawn = isLineDrawn(gameState, 'vertical', r, c);
              if (drawn) return null;
              const startDot = getDotPosition(r, c);
              const edgeKey = getDotsAndBoxesEdgeKey({ orientation: 'vertical', row: r, col: c });
              const focused = focusedEdgeKey === edgeKey;
              return (
                <Pressable
                  key={`vtap-${r}-${c}`}
                  pointerEvents="none"
                  accessibilityRole="button"
                  accessibilityLabel={`Vertical line, row ${r + 1}, column ${c + 1}`}
                  accessibilityState={{ disabled: boardInputDisabled }}
                  disabled={boardInputDisabled}
                  onPress={() => handleLinePress('vertical', r, c)}
                  onFocus={() => setFocusedEdgeKey(edgeKey)}
                  onBlur={() => setFocusedEdgeKey((current) => current === edgeKey ? null : current)}
                  style={[
                    styles.semanticEdgeControl,
                    {
                      left: startDot.x - (focused ? 2 : 1),
                      top: startDot.y,
                      width: focused ? 4 : 2,
                      height: cellSize,
                      backgroundColor: focused ? theme.colors.primary : theme.colors.border,
                      opacity: focused ? 1 : 0.72,
                    },
                  ]}
                />
              );
            })
          )}

          {/* Dots */}
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const pos = getDotPosition(r, c);
              return (
                <View
                  key={`dot-${r}-${c}`}
                  pointerEvents="none"
                  style={[
                    styles.dot,
                    {
                      left: pos.x - dotSize / 2,
                      top: pos.y - dotSize / 2,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: theme.colors.text,
                      borderWidth: theme.materials.boardBorderWidth,
                      borderColor: theme.colors.border,
                      shadowColor: theme.materials.glowColor,
                      shadowOffset: { width: 0, height: theme.materials.cellDepth },
                      shadowOpacity: theme.materials.glowOpacity || theme.materials.pieceShadowOpacity,
                      shadowRadius: 3,
                    },
                  ]}
                />
              );
            })
          )}
        </ThemedBoardSurface>
      </View>

      {/* Game Over Modal */}

      </View>
      {shortLandscape ? <View style={{ width: 220, justifyContent: 'center', gap: 12 }}><StatusRail>{gameStatus}<ThemedText variant="label" style={{ textAlign: 'center', marginTop: 8 }}>P1 {gameState.scores.player1} · P2 {gameState.scores.player2}</ThemedText><ThemedText variant="caption" style={{ minHeight: 22, textAlign: 'center' }}>{showExtraTurn ? 'Extra turn!' : aiThinking ? 'AI is thinking…' : ''}</ThemedText></StatusRail>{rematch}</View> : null}
      </View>

      <GameOverModal
        visible={showGameOver}
        result={{
          winner: gameState.winner ?? 'draw',
          score: gameState.scores,
        }}
        onRematch={handleRematch}
        onHome={handleHome}
        gameName="Dots & Boxes"
      />
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
    paddingVertical: 12,
  },
  backButton: {
    width: 60,
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  compactScoreContainer: {
    paddingVertical: 4,
  },
  compactStatus: {
    minHeight: 18,
    textAlign: 'center',
    marginBottom: 2,
  },
  scoreItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  boardWrapper: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    zIndex: 10,
  },
  drawnLine: {
    position: 'absolute',
    zIndex: 5,
  },
  semanticEdgeControl: {
    position: 'absolute',
    zIndex: 8,
    borderRadius: 2,
  },
  boxFill: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSelector: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
});
