import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
  FadeIn,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameShell } from '../../src/components/ui/GameShell';
import { StatusRail } from '../../src/components/ui/StatusRail';
import { useTheme } from '../../src/theme/ThemeProvider';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { Button } from '../../src/components/ui/Button';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { recordGameResult } from '../../src/storage/scores';
import {
  createGame,
  dropPiece,
  getAvailableColumns,
  getLowestEmptyRow,
  type GameState,
  type Player,
} from '../../src/engines/connect-four';
import { getAIMove } from '../../src/ai/connect-four-ai';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { GAME_VISUALS } from '../../src/game-visuals/registry';
import { getDropMotion, getMotionPreset } from '../../src/game-visuals/presentation';
import { ThemedBoardSurface } from '../../src/components/game-visuals/ThemedBoardSurface';
import { BoardPressable } from '../../src/components/game-visuals/BoardPressable';
import { GamePieceImage } from '../../src/components/game-visuals/GamePieceImage';
import { VictoryAccent } from '../../src/components/game-visuals/VictoryAccent';

const ROWS = 6;
const COLS = 7;

// Animated piece component that falls into place
function AnimatedPiece({
  player,
  mark,
  row,
  size,
  isWinning,
}: {
  player: Player;
  mark: string;
  row: number;
  size: number;
  isWinning: boolean;
}) {
  const { theme, themeName } = useTheme();
  const reducedMotion = useReducedMotion();
  const motion = getDropMotion(row, size, reducedMotion);
  const translateY = useSharedValue(motion.translateYFrom);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: motion.duration });
  }, [motion.duration, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: (size * 0.8) / 2,
          backgroundColor: 'transparent',
          borderWidth: isWinning ? 3 : 2,
          borderColor: theme.colors.text,
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.shadows.sm,
        },
        animatedStyle,
      ]}
    >
      <GamePieceImage source={player === 'red' ? GAME_VISUALS[themeName].connectFour.player1 : GAME_VISUALS[themeName].connectFour.player2} size={size * 0.78} />
      <ThemedText aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" variant="label" style={{ position: 'absolute', color: theme.colors.text, backgroundColor: theme.colors.surfaceRaised, borderRadius: size / 2, paddingHorizontal: 3, fontSize: Math.max(11, size * 0.24) }}>{isWinning ? mark + '✓' : mark}</ThemedText>
      <VictoryAccent visible={isWinning} kind="ring" size={size * 0.8} style={{ position: 'absolute' }} />
    </Animated.View>
  );
}

export default function ConnectFourScreen() {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, width, height } = useResponsive();
  const shortLandscape = width > height && height < 560;
  // The board area holds the drop-arrow row (36px + 12px margin) above a 7×6 grid.
  const { onLayout: onBoardAreaLayout, size: boardWidth } = useBoardFit({
    aspectRatio: ROWS / COLS,
    extraHeight: 56,
    maxSize: 700,
    minSize: 154,
    inset: 8,
  });

  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [gameState, setGameState] = useState<GameState>(createGame());
  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [showDifficultySelector, setShowDifficultySelector] = useState(resolvedMode === 'single');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showGameOver, setShowGameOver] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const startTimeRef = useRef(Date.now());
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const cellSize = boardWidth / COLS;
  const boardHeight = cellSize * ROWS;

  const isWinningCell = useCallback(
    (row: number, col: number): boolean => {
      if (!gameState.winningLine) return false;
      return gameState.winningLine.some(([r, c]) => r === row && c === col);
    },
    [gameState.winningLine]
  );

  const handleDifficultySelect = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setShowDifficultySelector(false);
    setGameState(createGame());
    startTimeRef.current = Date.now();
  }, []);

  const handleColumnPress = useCallback(
    (col: number) => {
      if (gameState.isGameOver || aiThinking) return;
      if (getLowestEmptyRow(gameState.board, col) === null) return;

      const newState = dropPiece(gameState, col);
      if (newState === gameState) return;

      setGameState(newState);

      if (newState.isGameOver) {
        const durationSeconds = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );

        if (mode === 'single') {
          const humanPlayer: Player = 'red';
          const result =
            newState.winner === 'draw'
              ? 'draw'
              : newState.winner === humanPlayer
                ? 'win'
                : 'loss';
          recordGameResult({
            game: 'connect-four',
            mode: 'single',
            player: 'Player 1',
            score: result === 'win' ? 1 : 0,
            result,
            durationSeconds,
          });
        } else {
          const winnerLabel =
            newState.winner === 'red' ? 'Player 1' : 'Player 2';
          if (newState.winner !== 'draw') {
            recordGameResult({
              game: 'connect-four',
              mode: 'multiplayer',
              player: winnerLabel,
              score: 1,
              result: 'win',
              durationSeconds,
            });
          } else {
            recordGameResult({
              game: 'connect-four',
              mode: 'multiplayer',
              player: 'Player 1',
              score: 0,
              result: 'draw',
              durationSeconds,
            });
          }
        }

        setTimeout(() => setShowGameOver(true), 600);
      }
    },
    [gameState, aiThinking, mode]
  );

  // AI move
  useEffect(() => {
    if (
      mode !== 'single' ||
      gameState.isGameOver ||
      gameState.currentPlayer !== 'yellow'
    ) {
      return;
    }

    setAiThinking(true);
    const timeout = setTimeout(() => {
      const currentState = gameStateRef.current;
      if (currentState.isGameOver || currentState.currentPlayer !== 'yellow') {
        setAiThinking(false);
        return;
      }

      const col = getAIMove(currentState, difficulty);
      if (col >= 0) {
        const newState = dropPiece(currentState, col);
        setGameState(newState);

        if (newState.isGameOver) {
          const durationSeconds = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );
          const result =
            newState.winner === 'draw'
              ? 'draw'
              : newState.winner === 'red'
                ? 'win'
                : 'loss';
          recordGameResult({
            game: 'connect-four',
            mode: 'single',
            player: 'Player 1',
            score: result === 'win' ? 1 : 0,
            result,
            durationSeconds,
          });
          setTimeout(() => setShowGameOver(true), 600);
        }
      }
      setAiThinking(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [gameState.currentPlayer, gameState.isGameOver, mode, difficulty]);

  const handleRematch = useCallback(() => {
    setShowGameOver(false);
    setGameState(createGame());
    startTimeRef.current = Date.now();
  }, []);

  const handleHome = useCallback(() => {
    setShowGameOver(false);
    router.back();
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const gameOverResult = useMemo(() => {
    if (gameState.winner === 'draw') {
      return { winner: 'draw' as const };
    }
    if (gameState.winner === 'red') {
      return { winner: 'player1' as const };
    }
    return { winner: 'player2' as const };
  }, [gameState.winner]);

  const currentTurnPlayer =
    gameState.currentPlayer === 'red' ? 'player1' : 'player2';

  const playerNames =
    mode === 'single'
      ? { player1: 'You', player2: 'AI' }
      : { player1: 'Player 1', player2: 'Player 2' };

  if (showDifficultySelector) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceSunken,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            maxWidth: contentMaxWidth,
          },
        ]}
      >
        <DifficultySelector
          visible={showDifficultySelector}
          onSelect={handleDifficultySelect}
          onClose={() => router.back()}
          gameName="Four in a Row"
        />
      </View>
    );
  }

  const gameStatus = (<>
      {/* Turn Indicator */}
      {true && (
        <TurnIndicator
          currentPlayer={currentTurnPlayer}
          playerNames={playerNames}
        />
      )}
      {mode === 'single' && (
        <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
          Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </ThemedText>
      )}

      <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center' }}>Drop a disc · Connect four in any direction</ThemedText>
      </>);

  const rematch = <Button title="Rematch" onPress={handleRematch} variant="secondary" />;

  return (
    <GameShell title="Four in a Row" onBack={handleBack} footer={shortLandscape ? undefined : rematch} status={shortLandscape ? undefined : gameStatus}>
      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, minHeight: 0 }}>

      <View style={styles.boardArea} onLayout={onBoardAreaLayout}>
      {/* Column tap targets */}
      <View style={[styles.columnHeaders, { width: boardWidth, marginTop: 12 }]}>
        {Array.from({ length: COLS }, (_, col) => {
          const isAvailable =
            !gameState.isGameOver &&
            !aiThinking &&
            getLowestEmptyRow(gameState.board, col) !== null;

          return (
            <BoardPressable
              key={col}
              accessibilityRole="button"
              accessibilityLabel={`Drop in column ${col + 1}`}
              disabled={!isAvailable}
              onPress={() => handleColumnPress(col)}
              style={[
                styles.columnTarget,
                {
                  width: cellSize,
                  height: 44,
                  opacity: isAvailable ? 1 : 0.3,
                },
              ]}
            >
              <View
                style={[
                  styles.dropArrow,
                  {
                    borderTopColor: isAvailable
                      ? gameState.currentPlayer === 'red'
                        ? theme.colors.player1
                        : theme.colors.player2
                      : theme.colors.textMuted,
                  },
                ]}
              />
            </BoardPressable>
          );
        })}
      </View>

      {/* Board */}
      <ThemedBoardSurface
        testID="game-board"
        style={[
          styles.board,
          {
            width: boardWidth,
            height: boardHeight,
            borderWidth: 2,
            borderRadius: theme.borderRadius.md,
          },
        ]}
      >
        {Array.from({ length: ROWS }, (_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: COLS }, (_, col) => {
              const cell = gameState.board[row][col];
              const winning = isWinningCell(row, col);

              return (
                <BoardPressable
                  key={col}
                  accessibilityRole="button"
                  accessibilityLabel={`Row ${row + 1}, column ${col + 1}: ${cell ?? 'empty'}${winning ? ', winning disc' : ''}`}
                  onPress={() => handleColumnPress(col)}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cellHole,
                      {
                        width: cellSize * 0.8,
                        height: cellSize * 0.8,
                        borderRadius: (cellSize * 0.8) / 2,
                        backgroundColor: cell
                          ? 'transparent'
                          : theme.colors.surfaceSunken,
                        borderWidth: 2,
                        borderColor: theme.colors.border,
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: theme.materials.cellDepth },
                        shadowOpacity: theme.materials.pieceShadowOpacity,
                        shadowRadius: 2,
                      },
                    ]}
                  >
                    {cell !== null && (
                      <AnimatedPiece
                        mark={cell === 'red' ? '1' : '2'}
                        player={cell}
                        row={row}
                        size={cellSize}
                        isWinning={winning}
                      />
                    )}
                  </View>
                </BoardPressable>
              );
            })}
          </View>
        ))}
      </ThemedBoardSurface>
      </View>

      {/* AI thinking indicator (space is always reserved so the board doesn't resize) */}
      <View style={styles.thinkingContainer}>
        {aiThinking && (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(getMotionPreset('place', false).duration)}>
            <ThemedText
              variant="caption"
              style={{ color: theme.colors.textMuted }}
            >
              AI is thinking...
            </ThemedText>
          </Animated.View>
        )}
      </View>

      {/* Bottom buttons */}

      {/* Game Over Modal */}

      </View>
      {shortLandscape ? <View style={{ width: 220, justifyContent: 'center', gap: 12 }}><StatusRail>{gameStatus}</StatusRail>{rematch}</View> : null}
      </View>

      <GameOverModal
        visible={showGameOver}
        result={gameOverResult}
        onRematch={handleRematch}
        onHome={handleHome}
        gameName="Four in a Row"
        playerNames={playerNames}
      />
    </GameShell>
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
  backButton: {
    width: 60,
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  boardArea: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
  columnTarget: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  board: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellHole: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thinkingContainer: {
    minHeight: 24,
    justifyContent: 'center',
  },
  bottomButtons: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
});
