import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import { THEME_TOKENS } from '../../src/utils/tokens';
import { useBoardFit, useResponsive } from '../../src/utils/layout';


function CellContent({
  value,
  theme,
  themeName,
}: {
  value: Player | null;
  theme: ReturnType<typeof useTheme>['theme'];
  themeName: string;
}) {
  if (!value) return null;

  const tokens = THEME_TOKENS[themeName as keyof typeof THEME_TOKENS];
  const imageSource = value === 'X' ? tokens.tttX : tokens.tttO;

  return (
    <Animated.View
      entering={FadeIn.duration(theme.animation.duration.medium)}
      style={styles.cellImageWrapper}
    >
      <Image
        source={imageSource}
        style={styles.cellImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export default function TicTacToeScreen() {
  const { theme, themeName } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsive();
  const { onLayout: onBoardAreaLayout, size: boardSize } = useBoardFit();
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tic Tac Toe',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Animated.Text style={{ color: theme.colors.text, fontSize: 16 }}>← Back</Animated.Text>
            </Pressable>
          ),
        }}
      />

      <View style={[styles.content, { paddingTop: 16 }]}>
        {!gameState.isGameOver && (
          <TurnIndicator
            currentPlayer={currentTurnPlayer}
            playerNames={playerNames}
          />
        )}
        {isSinglePlayer && (
          <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
            Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </ThemedText>
        )}

        <View style={styles.boardWrapper} onLayout={onBoardAreaLayout}>
          <View
            style={[
              styles.board,
              {
                width: boardSize,
                height: boardSize,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                borderColor: theme.colors.border,
                borderWidth: 2,
                ...theme.shadows.md,
              },
            ]}
          >
            {gameState.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isWinCell = isWinningCell(rowIndex, colIndex);
                const isLastCol = colIndex === 2;
                const isLastRow = rowIndex === 2;

                return (
                  <Pressable
                    key={`${rowIndex}-${colIndex}`}
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
                      },
                    ]}
                  >
                    <CellContent value={cell} theme={theme} themeName={themeName} />
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
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
