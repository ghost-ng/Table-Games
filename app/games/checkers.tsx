import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { THEME_TOKENS } from '../../src/utils/tokens';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { Button } from '../../src/components/ui/Button';
import {
  createGame,
  getValidMoves,
  makeMove,
  type GameState,
  type Position,
  type Move,
  type Player,
} from '../../src/engines/checkers';
import { getAIMove } from '../../src/ai/checkers-ai';
import { recordGameResult } from '../../src/storage/scores';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';

const BOARD_SIZE = 8;

// ─── Animated Piece Component ───────────────────────────────────────────────

interface AnimatedPieceProps {
  player: Player;
  isKing: boolean;
  isSelected: boolean;
  cellSize: number;
  row: number;
  col: number;
  theme: any;
  themeName: string;
  captured: boolean;
}

function AnimatedPiece({
  player,
  isKing,
  isSelected,
  cellSize,
  row,
  col,
  theme,
  themeName,
  captured,
}: AnimatedPieceProps) {
  const translateX = useSharedValue(col * cellSize);
  const translateY = useSharedValue(row * cellSize);
  const opacity = useSharedValue(captured ? 0 : 1);
  const scale = useSharedValue(isSelected ? 1.1 : 1);

  useEffect(() => {
    translateX.value = withTiming(col * cellSize, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withTiming(row * cellSize, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [col, row, cellSize]);

  useEffect(() => {
    if (captured) {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [captured]);

  useEffect(() => {
    scale.value = withTiming(isSelected ? 1.1 : 1, { duration: 150 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const pieceSize = cellSize * 0.75;
  const tokens = THEME_TOKENS[themeName as keyof typeof THEME_TOKENS];
  const pieceImage = player === 'player1' ? tokens.checkerP1 : tokens.checkerP2;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: cellSize,
          height: cellSize,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: isSelected ? 10 : 1,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          {
            width: pieceSize,
            height: pieceSize,
            borderRadius: pieceSize / 2,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: isSelected ? 3 : 0,
            borderColor: isSelected ? '#FFD700' : 'transparent',
          },
          isSelected && {
            shadowColor: '#FFD700',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 8,
          },
        ]}
      >
        <Image
          source={pieceImage}
          style={{ width: pieceSize, height: pieceSize }}
          resizeMode="cover"
        />
        {isKing && (
          <Image
            source={require('../../assets/pieces/crown.webp')}
            style={{
              position: 'absolute',
              width: pieceSize * 0.55,
              height: pieceSize * 0.55,
            }}
            resizeMode="contain"
          />
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function CheckersScreen() {
  const { theme, themeName } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { onLayout: onBoardAreaLayout, size: boardWidth } = useBoardFit();

  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [showDifficultySelector, setShowDifficultySelector] = useState(resolvedMode === 'single');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<GameState>(createGame());
  const [showGameOver, setShowGameOver] = useState(false);
  const gameStartTime = useRef(Date.now());
  const aiProcessing = useRef(false);

  const cellSize = boardWidth / BOARD_SIZE;

  const lightSquareColor = theme.colors.background;
  const darkSquareColor = theme.colors.surface;

  // ─── Reset game ─────────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    setGameState(createGame());
    setShowGameOver(false);
    gameStartTime.current = Date.now();
    aiProcessing.current = false;
  }, []);

  // ─── Record game result ─────────────────────────────────────────────────

  const handleGameOver = useCallback(
    (state: GameState) => {
      if (!state.winner || !mode) return;
      setShowGameOver(true);

      const durationSeconds = Math.round(
        (Date.now() - gameStartTime.current) / 1000
      );

      if (mode === 'single') {
        recordGameResult({
          game: 'checkers',
          mode: 'single',
          player: 'Player 1',
          score: state.pieces.player1,
          result: state.winner === 'player1' ? 'win' : 'loss',
          durationSeconds,
        });
      } else {
        recordGameResult({
          game: 'checkers',
          mode: 'multiplayer',
          player: state.winner === 'player1' ? 'Player 1' : 'Player 2',
          score:
            state.winner === 'player1'
              ? state.pieces.player1
              : state.pieces.player2,
          result: 'win',
          durationSeconds,
        });
      }
    },
    [mode]
  );

  // ─── Watch for game over ────────────────────────────────────────────────

  useEffect(() => {
    if (gameState.isGameOver && gameState.winner) {
      handleGameOver(gameState);
    }
  }, [gameState.isGameOver]);

  // ─── AI logic ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      mode !== 'single' ||
      gameState.currentPlayer !== 'player2' ||
      gameState.isGameOver ||
      aiProcessing.current
    ) {
      return;
    }

    aiProcessing.current = true;

    const executeAIMoves = () => {
      try {
        const moves = getAIMove(gameState, difficulty);
        if (moves.length === 0) {
          aiProcessing.current = false;
          return;
        }

        // Execute moves sequentially with delays
        let currentState = gameState;
        let delay = 500; // Initial delay before first move

        const executeNext = (index: number) => {
          if (index >= moves.length) {
            aiProcessing.current = false;
            return;
          }

          setTimeout(() => {
            setGameState((prev) => {
              const newState = makeMove(
                prev,
                moves[index].from,
                moves[index].to
              );
              currentState = newState;

              // Schedule next move if more in sequence
              if (index + 1 < moves.length) {
                setTimeout(() => executeNext(index + 1), 300);
              } else {
                aiProcessing.current = false;
              }

              return newState;
            });
          }, delay);

          delay = 300; // Subsequent moves are faster
        };

        executeNext(0);
      } catch {
        aiProcessing.current = false;
      }
    };

    executeAIMoves();
  }, [gameState.currentPlayer, gameState.isGameOver, mode, difficulty]);

  // ─── Handle cell press ─────────────────────────────────────────────────

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameState.isGameOver) return;
      if (mode === 'single' && gameState.currentPlayer === 'player2') return;
      if (aiProcessing.current) return;

      const piece = gameState.board[row][col];

      // If in a jump sequence, only allow moves from the jumping piece
      if (gameState.jumpSequence) {
        // Check if tapping a valid destination
        const isValidDest = gameState.validMoves.some(
          (m) => m.to.row === row && m.to.col === col
        );
        if (isValidDest) {
          const newState = makeMove(
            gameState,
            gameState.jumpSequence,
            { row, col }
          );
          setGameState(newState);
        }
        return;
      }

      // If tapping own piece, select it
      if (piece && piece.player === gameState.currentPlayer) {
        const moves = getValidMoves(
          gameState.board,
          { row, col },
          gameState.currentPlayer
        );

        if (moves.length > 0) {
          setGameState((prev) => ({
            ...prev,
            selectedPiece: { row, col },
            validMoves: moves,
          }));
        }
        return;
      }

      // If a piece is selected and tapping a valid destination
      if (gameState.selectedPiece) {
        const isValidDest = gameState.validMoves.some(
          (m) => m.to.row === row && m.to.col === col
        );

        if (isValidDest) {
          const newState = makeMove(
            gameState,
            gameState.selectedPiece,
            { row, col }
          );
          setGameState(newState);
        } else {
          // Deselect
          setGameState((prev) => ({
            ...prev,
            selectedPiece: null,
            validMoves: [],
          }));
        }
      }
    },
    [gameState, mode]
  );

  // ─── Render helpers ────────────────────────────────────────────────────

  const isValidMoveTarget = (row: number, col: number): boolean => {
    return gameState.validMoves.some(
      (m) => m.to.row === row && m.to.col === col
    );
  };

  const isSelectedPiece = (row: number, col: number): boolean => {
    if (!gameState.selectedPiece && !gameState.jumpSequence) return false;
    const sel = gameState.jumpSequence || gameState.selectedPiece;
    return sel !== null && sel.row === row && sel.col === col;
  };

  // ─── Difficulty selector ────────────────────────────────────────────────────

  if (showDifficultySelector) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
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
          gameName="Checkers"
        />
      </View>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const playerNames =
    mode === 'single'
      ? { player1: 'You', player2: 'AI' }
      : { player1: 'Player 1', player2: 'Player 2' };

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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText variant="body" style={{ color: theme.colors.primary }}>
            Back
          </ThemedText>
        </Pressable>
        <ThemedText variant="heading" style={styles.title}>
          Checkers
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      {/* Turn Indicator */}
      {!gameState.isGameOver && (
        <TurnIndicator
          currentPlayer={gameState.currentPlayer}
          playerNames={playerNames}
        />
      )}
      {mode === 'single' && (
        <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
          Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </ThemedText>
      )}

      {/* Piece Counts */}
      <View style={styles.countsRow}>
        <View style={styles.countItem}>
          <View
            style={[
              styles.countDot,
              { backgroundColor: theme.colors.player1 },
            ]}
          />
          <ThemedText variant="body" style={{ color: theme.colors.text }}>
            {playerNames.player1}: {gameState.pieces.player1}
          </ThemedText>
        </View>
        <View style={styles.countItem}>
          <View
            style={[
              styles.countDot,
              { backgroundColor: theme.colors.player2 },
            ]}
          />
          <ThemedText variant="body" style={{ color: theme.colors.text }}>
            {playerNames.player2}: {gameState.pieces.player2}
          </ThemedText>
        </View>
      </View>

      {/* Board */}
      <View style={styles.boardArea} onLayout={onBoardAreaLayout}>
      <View
        style={[
          styles.boardContainer,
          {
            width: boardWidth,
            height: boardWidth,
            borderRadius: theme.borderRadius.md,
            overflow: 'hidden',
            ...theme.shadows.md,
          },
        ]}
      >
        {/* Squares */}
        {Array.from({ length: BOARD_SIZE }, (_, row) =>
          Array.from({ length: BOARD_SIZE }, (_, col) => {
            const isDark = (row + col) % 2 === 1;
            const isTarget = isValidMoveTarget(row, col);

            return (
              <Pressable
                key={`${row}-${col}`}
                onPress={() => handleCellPress(row, col)}
                style={[
                  {
                    position: 'absolute',
                    left: col * cellSize,
                    top: row * cellSize,
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: isDark
                      ? darkSquareColor
                      : lightSquareColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                {/* Valid move indicator */}
                {isTarget && (
                  <View
                    style={{
                      width: cellSize * 0.3,
                      height: cellSize * 0.3,
                      borderRadius: cellSize * 0.15,
                      backgroundColor: 'rgba(255, 215, 0, 0.6)',
                    }}
                  />
                )}
              </Pressable>
            );
          })
        )}

        {/* Pieces layer */}
        {Array.from({ length: BOARD_SIZE }, (_, row) =>
          Array.from({ length: BOARD_SIZE }, (_, col) => {
            const piece = gameState.board[row][col];
            if (!piece) return null;

            return (
              <AnimatedPiece
                key={`piece-${row}-${col}`}
                player={piece.player}
                isKing={piece.type === 'king'}
                isSelected={isSelectedPiece(row, col)}
                cellSize={cellSize}
                row={row}
                col={col}
                theme={theme}
                themeName={themeName}
                captured={false}
              />
            );
          })
        )}

        {/* Transparent touch layer on top of pieces for selection */}
        {Array.from({ length: BOARD_SIZE }, (_, row) =>
          Array.from({ length: BOARD_SIZE }, (_, col) => {
            const isDark = (row + col) % 2 === 1;
            if (!isDark) return null;

            return (
              <Pressable
                key={`touch-${row}-${col}`}
                onPress={() => handleCellPress(row, col)}
                style={{
                  position: 'absolute',
                  left: col * cellSize,
                  top: row * cellSize,
                  width: cellSize,
                  height: cellSize,
                  zIndex: 20,
                }}
              />
            );
          })
        )}
      </View>
      </View>

      {/* Mandatory jump hint (space is always reserved so the board doesn't resize) */}
      <View style={styles.jumpHintRow}>
        {gameState.mustJump && !gameState.isGameOver && (
          <ThemedText
            variant="caption"
            style={[styles.jumpHint, { color: theme.colors.error }]}
          >
            Jump available - you must jump!
          </ThemedText>
        )}
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomButtons}>
        <Button title="Rematch" onPress={resetGame} variant="secondary" size="md" />
      </View>

      {/* Game Over Modal */}
      <GameOverModal
        visible={showGameOver}
        result={{
          winner: gameState.winner || 'player1',
          score: {
            player1: gameState.pieces.player1,
            player2: gameState.pieces.player2,
          },
        }}
        onRematch={resetGame}
        onHome={() => router.back()}
        gameName="Checkers"
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
  backButton: {
    width: 60,
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  boardArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContainer: {
    position: 'relative',
  },
  jumpHintRow: {
    minHeight: 24,
    justifyContent: 'center',
  },
  jumpHint: {
    fontWeight: '600',
  },
  bottomButtons: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
});
