import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useReducedMotion,
} from 'react-native-reanimated';
import { GameShell } from '../../src/components/ui/GameShell';
import { StatusRail } from '../../src/components/ui/StatusRail';
import { Button } from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/ThemeProvider';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { recordGameResult } from '../../src/storage/scores';
import {
  type GameState,
  type Player,
  createGame,
  makeMove,
} from '../../src/engines/tic-tac-toe';
import { getAIMove } from '../../src/ai/tic-tac-toe-ai';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { GAME_VISUALS } from '../../src/game-visuals/registry';
import { getMotionPreset } from '../../src/game-visuals/presentation';
import { ThemedBoardSurface } from '../../src/components/game-visuals/ThemedBoardSurface';
import { BoardPressable } from '../../src/components/game-visuals/BoardPressable';
import { GamePieceImage } from '../../src/components/game-visuals/GamePieceImage';
import { TactileCell } from '../../src/components/game-visuals/TactileCell';
import { VictoryAccent } from '../../src/components/game-visuals/VictoryAccent';
import { useBoardFit, useResponsive } from '../../src/utils/layout';


function CellContent({ value, size }: { value: Player; size: number }) {
  const { themeName } = useTheme();
  const reducedMotion = useReducedMotion();
  const visuals = GAME_VISUALS[themeName].ticTacToe;
  return (
    <Animated.View pointerEvents="none" aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      entering={reducedMotion ? undefined : FadeIn.duration(getMotionPreset('place', false).duration)}>
      <GamePieceImage source={value === 'X' ? visuals.x : visuals.o} size={size} />
    </Animated.View>
  );
}

export default function TicTacToeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, width, height } = useResponsive();
  const shortLandscape = width > height && height < 560;
  const { onLayout: onBoardAreaLayout, size: boardSize } = useBoardFit({ maxSize: 640, minSize: 138, inset: 8 });
  const cellSize = boardSize / 3;
  const params = useLocalSearchParams<{ mode: 'single' | 'multiplayer' }>();

  const resolvedMode = params.mode ?? 'single';
  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [showDifficultySelector, setShowDifficultySelector] = useState(resolvedMode === 'single');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<GameState>(createGame);
  const [showModal, setShowModal] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);
  const startTimeRef = useRef(Date.now());
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSinglePlayer = mode === 'single';
  const playerNames = isSinglePlayer
    ? { player1: 'You', player2: 'AI' }
    : { player1: 'Player 1', player2: 'Player 2' };

  // Determine whose turn indicator to show
  const currentTurnPlayer: 'player1' | 'player2' =
    gameState.currentPlayer === 'X' ? 'player1' : 'player2';

  // Check if a cell is part of the winning line
  const isWinningCell = useCallback(
    (row: number, col: number): boolean => {
      if (!gameState.winningLine) return false;
      return gameState.winningLine.some(([r, c]) => r === row && c === col);
    },
    [gameState.winningLine]
  );

  // Record game result
  const recordResult = useCallback(async () => {
    if (resultRecorded || !gameState.isGameOver) return;
    setResultRecorded(true);

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    if (isSinglePlayer) {
      let result: 'win' | 'loss' | 'draw';
      if (gameState.winner === 'draw') {
        result = 'draw';
      } else if (gameState.winner === 'X') {
        result = 'win';
      } else {
        result = 'loss';
      }
      await recordGameResult({
        game: 'tic-tac-toe',
        mode: 'single',
        player: 'Player',
        score: result === 'win' ? 1 : 0,
        result,
        durationSeconds,
      });
    } else {
      // In multiplayer, record from player 1's perspective
      let result: 'win' | 'loss' | 'draw';
      if (gameState.winner === 'draw') {
        result = 'draw';
      } else if (gameState.winner === 'X') {
        result = 'win';
      } else {
        result = 'loss';
      }
      await recordGameResult({
        game: 'tic-tac-toe',
        mode: 'multiplayer',
        player: 'Player 1',
        score: result === 'win' ? 1 : 0,
        result,
        durationSeconds,
      });
    }
  }, [gameState, isSinglePlayer, resultRecorded]);

  // Handle game over
  useEffect(() => {
    if (gameState.isGameOver) {
      recordResult();
      const timeout = setTimeout(() => setShowModal(true), 600);
      return () => clearTimeout(timeout);
    }
  }, [gameState.isGameOver]);

  // AI move in single player mode
  useEffect(() => {
    if (
      isSinglePlayer &&
      !gameState.isGameOver &&
      gameState.currentPlayer === 'O'
    ) {
      aiTimeoutRef.current = setTimeout(() => {
        setGameState((prev) => {
          if (prev.isGameOver || prev.currentPlayer !== 'O') return prev;
          const [row, col] = getAIMove(prev, difficulty);
          return makeMove(prev, row, col);
        });
      }, 500);

      return () => {
        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current);
        }
      };
    }
  }, [gameState.currentPlayer, gameState.isGameOver, isSinglePlayer, difficulty]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameState.isGameOver) return;
      if (gameState.board[row][col] !== null) return;
      // In single player, only allow moves when it's X's turn
      if (isSinglePlayer && gameState.currentPlayer !== 'X') return;

      setGameState((prev) => makeMove(prev, row, col));
    },
    [gameState.isGameOver, gameState.board, gameState.currentPlayer, isSinglePlayer]
  );

  const handleRematch = useCallback(() => {
    setShowModal(false);
    setResultRecorded(false);
    startTimeRef.current = Date.now();
    setGameState(createGame());
  }, []);

  const handleHome = useCallback(() => {
    setShowModal(false);
    router.back();
  }, [router]);

  const getModalResult = () => {
    if (gameState.winner === 'draw') {
      return { winner: 'draw' as const };
    }
    return {
      winner: gameState.winner === 'X' ? ('player1' as const) : ('player2' as const),
    };
  };

  const gameStatus = (
      <><TurnIndicator currentPlayer={currentTurnPlayer} playerNames={playerNames} />
      <ThemedText variant="caption" style={{ textAlign: 'center', color: theme.colors.textMuted }}>
        {gameState.isGameOver ? 'Game complete' : `Place ${gameState.currentPlayer} · Make a line of three`}{isSinglePlayer ? ` · ${difficulty}` : ''}
      </ThemedText></>);

  return (
    <GameShell title="Tic Tac Toe" onBack={() => router.back()} footer={shortLandscape ? undefined : <Button title="Rematch" onPress={handleRematch} variant="secondary" />} status={shortLandscape ? undefined : gameStatus}>
      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, minHeight: 0 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={styles.boardWrapper} onLayout={onBoardAreaLayout}>
          <ThemedBoardSurface
            testID="game-board"
            style={[
              styles.board,
              {
                width: boardSize,
                height: boardSize,
                borderWidth: 2,
              },
            ]}
          >
            {gameState.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isWinCell = isWinningCell(rowIndex, colIndex);
                const isLastCol = colIndex === 2;
                const isLastRow = rowIndex === 2;

                return (
                  <BoardPressable
                    key={`${rowIndex}-${colIndex}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Row ${rowIndex + 1}, column ${colIndex + 1}: ${cell ?? 'empty'}${isWinCell ? ', winning mark' : ''}`}
                    disabled={cell !== null || gameState.isGameOver || (isSinglePlayer && gameState.currentPlayer !== 'X')}
                    onPress={() => handleCellPress(rowIndex, colIndex)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize - 2,
                        height: cellSize - 2,
                        borderColor: theme.colors.border,
                        borderRightWidth: isLastCol ? 0 : 2,
                        borderBottomWidth: isLastRow ? 0 : 2,
                      },
                      isWinCell && {
                        backgroundColor: theme.colors.success + '25',
                        borderWidth: 3,
                        borderColor: theme.colors.success,
                      },
                    ]}
                  >
                    {({ pressed }) => (
                      <TactileCell pressed={pressed} state={isWinCell ? 'winning' : 'neutral'}
                        style={{ width: '94%', height: '94%', borderRadius: theme.borderRadius.sm }}>
                        {cell && <CellContent value={cell} size={cellSize * 0.72} />}
                        <VictoryAccent visible={isWinCell} kind="ring" size={cellSize * 0.8} style={{ position: 'absolute' }} />
                      </TactileCell>
                    )}
                  </BoardPressable>
                );
              })
            )}
          </ThemedBoardSurface>
        </View>
      </View>


      </View>
      {shortLandscape ? <View style={{ width: 220, justifyContent: 'center', gap: 12 }}><StatusRail>{gameStatus}</StatusRail><Button title="Rematch" onPress={handleRematch} variant="secondary" /></View> : null}
      </View>

      <DifficultySelector
        visible={showDifficultySelector}
        onSelect={(d) => {
          setDifficulty(d);
          setShowDifficultySelector(false);
          setGameState(createGame());
          startTimeRef.current = Date.now();
        }}
        onClose={() => router.back()}
        gameName="Tic Tac Toe"
      />

      <GameOverModal
        visible={showModal}
        result={getModalResult()}
        onRematch={handleRematch}
        onHome={handleHome}
        gameName="Tic Tac Toe"
        playerNames={playerNames}
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
  content: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -4,
  },
  boardWrapper: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 48,
    fontWeight: '700',
  },
  cellImageWrapper: {
    width: '70%',
    height: '70%',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
});
