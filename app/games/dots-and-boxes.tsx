import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { recordGameResult } from '../../src/storage/scores';
import {
  createGame,
  drawLine,
  getAvailableLines,
  isLineDrawn,
  type GameState,
  type Player,
  type LineOrientation,
} from '../../src/engines/dots-and-boxes';
import { getAIMove } from '../../src/ai/dots-and-boxes-ai';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { useBoardFit, useResponsive } from '../../src/utils/layout';

const BOARD_SIZE_OPTIONS = [
  { label: '3×3', value: 3, description: 'Quick' },
  { label: '4×4', value: 4, description: 'Classic' },
  { label: '5×5', value: 5, description: 'Standard' },
  { label: '6×6', value: 6, description: 'Large' },
];
const DEFAULT_GRID_SIZE = 5;
const DOT_SIZE = 10;
const LINE_THICKNESS = 4;
const TAP_ZONE = 28;
const BOARD_PADDING = 16;

export default function DotsAndBoxesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsive();
  const { onLayout: onBoardAreaLayout, size: boardSize } = useBoardFit();

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
  const startTimeRef = useRef(Date.now());
  const prevPlayerRef = useRef<Player>('player1');

  const cellSize = (boardSize - DOT_SIZE) / (gridSize - 1);

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
    x: col * cellSize + DOT_SIZE / 2,
    y: row * cellSize + DOT_SIZE / 2,
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
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top, maxWidth: contentMaxWidth }]}>
        <View style={styles.sizeSelector}>
          <ThemedText variant="heading" style={{ textAlign: 'center', marginBottom: 4 }}>
            Dots & Boxes
          </ThemedText>
          <ThemedText variant="caption" style={{ textAlign: 'center', color: theme.colors.textMuted, marginBottom: 20 }}>
            Choose board size
          </ThemedText>
          {BOARD_SIZE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => handleBoardSizeSelect(opt.value)}
              style={[
                styles.sizeOption,
                {
                  backgroundColor: opt.value === DEFAULT_GRID_SIZE ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                },
              ]}
            >
              <ThemedText
                variant="heading"
                style={{
                  color: opt.value === DEFAULT_GRID_SIZE ? '#FFFFFF' : theme.colors.text,
                  fontSize: 18,
                }}
              >
                {opt.label}
              </ThemedText>
              <ThemedText
                variant="caption"
                style={{
                  color: opt.value === DEFAULT_GRID_SIZE ? '#FFFFFFCC' : theme.colors.textMuted,
                }}
              >
                {opt.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
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
        <Pressable onPress={handleHome} style={styles.backButton}>
          <ThemedText variant="body" style={{ color: theme.colors.primary }}>
            Back
          </ThemedText>
        </Pressable>
        <ThemedText variant="heading" style={styles.title}>
          Dots & Boxes
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      {/* Turn Indicator */}
      {!gameState.isGameOver && (
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

      {/* Score Display */}
      <View style={styles.scoreContainer}>
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

      {/* Extra Turn Banner (space is always reserved so the board doesn't resize) */}
      <View style={styles.extraTurnRow}>
      {showExtraTurn && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[
            styles.extraTurnBanner,
            {
              backgroundColor: getPlayerColor(gameState.currentPlayer),
              borderRadius: theme.borderRadius.md,
            },
          ]}
        >
          <ThemedText variant="label" style={styles.extraTurnText}>
            Extra turn!
          </ThemedText>
        </Animated.View>
      )}
      </View>

      {/* Board */}
      <View style={styles.boardWrapper} onLayout={onBoardAreaLayout}>
        <View
          style={[
            styles.board,
            {
              width: boardSize,
              height: boardSize,
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
                  entering={FadeIn.duration(300)}
                  style={[
                    styles.boxFill,
                    {
                      left: pos.x,
                      top: pos.y,
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getPlayerColorAlpha(owner, 0.25),
                      borderRadius: 2,
                    },
                  ]}
                >
                  <ThemedText
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
                  </ThemedText>
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
                  style={[
                    styles.drawnLine,
                    {
                      left: startDot.x,
                      top: startDot.y - LINE_THICKNESS / 2,
                      width: cellSize,
                      height: LINE_THICKNESS,
                      backgroundColor: getPlayerColor(player),
                      borderRadius: LINE_THICKNESS / 2,
                    },
                  ]}
                />
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
                  style={[
                    styles.drawnLine,
                    {
                      left: startDot.x - LINE_THICKNESS / 2,
                      top: startDot.y,
                      width: LINE_THICKNESS,
                      height: cellSize,
                      backgroundColor: getPlayerColor(player),
                      borderRadius: LINE_THICKNESS / 2,
                    },
                  ]}
                />
              );
            })
          )}

          {/* Horizontal Line Tap Zones */}
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize - 1 }, (_, c) => {
              const drawn = isLineDrawn(gameState, 'horizontal', r, c);
              if (drawn) return null;
              const startDot = getDotPosition(r, c);
              return (
                <Pressable
                  key={`htap-${r}-${c}`}
                  onPress={() => handleLinePress('horizontal', r, c)}
                  style={[
                    styles.tapZone,
                    {
                      left: startDot.x,
                      top: startDot.y - TAP_ZONE / 2,
                      width: cellSize,
                      height: TAP_ZONE,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.lineHint,
                      {
                        width: cellSize - DOT_SIZE,
                        height: 2,
                        backgroundColor: theme.colors.border,
                        opacity: 0.3,
                        borderRadius: 1,
                      },
                    ]}
                  />
                </Pressable>
              );
            })
          )}

          {/* Vertical Line Tap Zones */}
          {Array.from({ length: gridSize - 1 }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const drawn = isLineDrawn(gameState, 'vertical', r, c);
              if (drawn) return null;
              const startDot = getDotPosition(r, c);
              return (
                <Pressable
                  key={`vtap-${r}-${c}`}
                  onPress={() => handleLinePress('vertical', r, c)}
                  style={[
                    styles.tapZone,
                    {
                      left: startDot.x - TAP_ZONE / 2,
                      top: startDot.y,
                      width: TAP_ZONE,
                      height: cellSize,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.lineHint,
                      {
                        width: 2,
                        height: cellSize - DOT_SIZE,
                        backgroundColor: theme.colors.border,
                        opacity: 0.3,
                        borderRadius: 1,
                      },
                    ]}
                  />
                </Pressable>
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
                  style={[
                    styles.dot,
                    {
                      left: pos.x - DOT_SIZE / 2,
                      top: pos.y - DOT_SIZE / 2,
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      borderRadius: DOT_SIZE / 2,
                      backgroundColor: theme.colors.text,
                    },
                  ]}
                />
              );
            })
          )}
        </View>
      </View>

      {/* AI thinking indicator — fixed height to prevent layout shift */}
      <View style={styles.thinkingContainer}>
        {aiThinking && (
          <ThemedText
            variant="caption"
            style={[styles.thinkingText, { color: theme.colors.textMuted }]}
          >
            AI is thinking...
          </ThemedText>
        )}
      </View>

      {/* Game Over Modal */}
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
    </View>
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
  scoreItem: {
    alignItems: 'center',
    gap: 2,
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
    fontSize: 28,
    fontWeight: '700',
  },
  extraTurnRow: {
    minHeight: 32,
    justifyContent: 'center',
  },
  extraTurnBanner: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  extraTurnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  boardWrapper: {
    flex: 1,
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
  tapZone: {
    position: 'absolute',
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineHint: {},
  boxFill: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingContainer: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingText: {
    textAlign: 'center',
  },
  sizeSelector: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
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
