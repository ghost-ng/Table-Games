import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GameShell } from '../../src/components/ui/GameShell';
import { useWebFocusRing } from '../../src/utils/useWebFocusRing';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeProvider';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { recordGameResult } from '../../src/storage/scores';
import {
  type GameState,
  type Position,
  createGame,
  submitWord,
  traceWord,
} from '../../src/engines/boggle';
import { useResponsive } from '../../src/utils/layout';
import { calculateGridBoardLayout } from '../../src/utils/boardSizing';
import { LetterTile } from '../../src/components/game-visuals/LetterTile';
import { ThemedBoardSurface } from '../../src/components/game-visuals/ThemedBoardSurface';
import { SelectionTrail } from '../../src/components/game-visuals/SelectionTrail';
import { haptics } from '../../src/utils/haptics';

const GRID_PADDING = 12;
const GRID_BORDER_WIDTH = 1;
const GRID_GAP = 8;

const ROUND_DURATION_MS = 120_000; // 2 minutes

// ─── Phase management ──────────────────────────────────────────────────────
type Phase = 'modeSelect' | 'playing' | 'passDevice' | 'playingP2';

export default function BoggleScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { gameContentWidth: contentWidth, height, isPhone, isTablet, isLandscape } = useResponsive();
  const shortLandscape = isLandscape && height < 560;
  // Width-bound on phones; on short/landscape screens keep the grid within ~55% of the height.
  const { boardWidth: gridSize, cellSize } = calculateGridBoardLayout({
    areaWidth: contentWidth - 24,
    heightLimit: shortLandscape ? 224 : Math.max(240, height * 0.55),
    maxSize: isTablet ? 520 : 400,
    isPhone,
    isLandscape,
    columns: 4,
    padding: GRID_PADDING,
    borderWidth: GRID_BORDER_WIDTH,
    gap: GRID_GAP,
  });

  // Mode & phase
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [phase, setPhase] = useState<Phase>('playing');

  // Game state
  const [gameState, setGameState] = useState<GameState>(() => createGame());
  const [currentInput, setCurrentInput] = useState('');
  // Cells tapped on the grid, in order. Empty while the player is typing instead.
  const [tapPath, setTapPath] = useState<Position[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION_MS);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
  const inputRef = useRef<TextInput>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSinglePlayer = mode === 'single';

  const clearWord = useCallback(() => {
    setCurrentInput('');
    setTapPath([]);
  }, []);

  // Typing replaces any tapped selection; the grid then highlights the typed word's path.
  const handleChangeText = useCallback((text: string) => {
    setCurrentInput(text);
    setTapPath([]);
  }, []);

  // Tap to build a word: adjacent cells extend it, the last cell undoes, an earlier
  // cell in the word rewinds to it, and any other cell starts a new word.
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (isGameOver) return;
      const inPathAt = tapPath.findIndex((p) => p.row === row && p.col === col);
      const last = tapPath[tapPath.length - 1];
      let next: Position[];
      if (inPathAt === tapPath.length - 1 && inPathAt >= 0) {
        next = tapPath.slice(0, -1);
      } else if (inPathAt >= 0) {
        next = tapPath.slice(0, inPathAt + 1);
      } else if (last && Math.abs(last.row - row) <= 1 && Math.abs(last.col - col) <= 1) {
        next = [...tapPath, { row, col }];
      } else {
        next = [{ row, col }];
      }
      haptics.selection();
      setTapPath(next);
      setCurrentInput(next.map((p) => gameState.board[p.row][p.col]).join(''));
    },
    [isGameOver, tapPath, gameState.board],
  );

  const highlightedPath = useMemo(() => {
    if (tapPath.length > 0) return tapPath;
    const typed = currentInput.trim().toUpperCase();
    return typed ? traceWord(gameState.board, typed) ?? [] : [];
  }, [tapPath, currentInput, gameState.board]);
  const currentPlayer = phase === 'playingP2' ? 'player2' : 'player1';

  // ── Derived data ─────────────────────────────────────────────────────────
  const currentFoundWords = gameState
    ? currentPlayer === 'player1'
      ? gameState.foundWords
      : gameState.foundWordsP2
    : new Map();

  const currentScore = gameState
    ? currentPlayer === 'player1'
      ? gameState.scores.player1
      : gameState.scores.player2
    : 0;

  const foundWordsArray = Array.from(currentFoundWords.values()).reverse();

  // ── Timer ────────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    const start = Date.now();
    setTimeRemaining(ROUND_DURATION_MS);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        stopTimer();
      }
    }, 100);
  }, [stopTimer]);

  // When timer hits 0, handle round end
  useEffect(() => {
    if (timeRemaining <= 0 && gameState && !isGameOver) {
      if (phase === 'playing' && mode === 'multiplayer') {
        // Player 1 done, switch to pass device
        stopTimer();
        setPhase('passDevice');
        clearWord();
        setFeedback(null);
      } else {
        // Single player done, or Player 2 done
        stopTimer();
        setIsGameOver(true);
      }
    }
  }, [timeRemaining, gameState, isGameOver, phase, mode, stopTimer]);

  // Start timer on mount since game begins immediately
  useEffect(() => {
    const start = Date.now();
    startTimeRef.current = start;
    setTimeRemaining(ROUND_DURATION_MS);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
      }
    }, 100);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [stopTimer]);

  // ── Show feedback temporarily ────────────────────────────────────────────
  const showFeedback = useCallback((text: string, isError: boolean) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback({ text, isError });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 2000);
  }, []);

  // ── Pass device -> Player 2 starts ──────────────────────────────────────
  const handlePassReady = useCallback(() => {
    setPhase('playingP2');
    clearWord();
    setFeedback(null);
    startTimer();
  }, [startTimer]);

  // ── Submit word ──────────────────────────────────────────────────────────
  const handleSubmitWord = useCallback(() => {
    if (!gameState || isGameOver) return;

    const word = currentInput;
    const wasTapped = tapPath.length > 0;
    clearWord();

    const result = submitWord({
      ...gameState,
      currentPlayer,
      isGameOver,
      timeRemainingMs: timeRemaining,
    }, word);
    if (!result.valid) {
      showFeedback(result.reason ?? 'Not a word', true);
      return;
    }

    setGameState(result.state);
    const score = result.state.scores[currentPlayer] - gameState.scores[currentPlayer];
    showFeedback(`+${score} point${score > 1 ? 's' : ''}!`, false);
    // Keep the keyboard up for typists; don't pop it open for players who tap.
    if (!wasTapped) inputRef.current?.focus();
  }, [gameState, isGameOver, timeRemaining, currentInput, tapPath, currentPlayer, showFeedback, clearWord]);

  // ── Game over handling ───────────────────────────────────────────────────
  useEffect(() => {
    if (isGameOver && gameState && !resultRecorded) {
      setResultRecorded(true);

      const durationSeconds = Math.round(
        (Date.now() - startTimeRef.current) / 1000,
      );

      if (isSinglePlayer) {
        recordGameResult({
          game: 'boggle',
          mode: 'single',
          player: 'Player',
          score: gameState.scores.player1,
          result: gameState.scores.player1 > 0 ? 'win' : 'draw',
          durationSeconds,
        });
      } else {
        const p1 = gameState.scores.player1;
        const p2 = gameState.scores.player2;
        // One record per game (like the other games): the winner, or a single draw.
        recordGameResult({
          game: 'boggle',
          mode: 'multiplayer',
          player: p1 >= p2 ? 'Player 1' : 'Player 2',
          score: Math.max(p1, p2),
          result: p1 === p2 ? 'draw' : 'win',
          durationSeconds,
        });
      }

      const timeout = setTimeout(() => setShowModal(true), 600);
      return () => clearTimeout(timeout);
    }
  }, [isGameOver]);

  // ── Rematch / Home ───────────────────────────────────────────────────────
  const handleRematch = useCallback(() => {
    setShowModal(false);
    setResultRecorded(false);
    setIsGameOver(false);
    clearWord();
    setFeedback(null);
    stopTimer();

    setGameState(createGame());
    setPhase('playing');
    startTimeRef.current = Date.now();
    setTimeout(() => {
      const start = Date.now();
      setTimeRemaining(ROUND_DURATION_MS);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
        }
      }, 100);
    }, 50);
  }, [mode, stopTimer]);

  const handleHome = useCallback(() => {
    setShowModal(false);
    stopTimer();
    router.back();
  }, [router, stopTimer]);

  // ── Modal result ─────────────────────────────────────────────────────────
  const getModalResult = () => {
    if (!gameState) return { winner: 'draw' as const };
    if (isSinglePlayer) {
      return {
        winner: 'player1' as const,
        score: { player1: gameState.scores.player1, player2: 0 },
      };
    }
    const p1 = gameState.scores.player1;
    const p2 = gameState.scores.player2;
    if (p1 > p2) return { winner: 'player1' as const, score: { player1: p1, player2: p2 } };
    if (p2 > p1) return { winner: 'player2' as const, score: { player1: p1, player2: p2 } };
    return { winner: 'draw' as const, score: { player1: p1, player2: p2 } };
  };

  // ── Format time ──────────────────────────────────────────────────────────
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const timerProgress = timeRemaining / ROUND_DURATION_MS;
  const timerColor =
    timerProgress > 0.5
      ? theme.colors.success
      : timerProgress > 0.2
      ? theme.colors.warning
      : theme.colors.error;

  const isPlaying = phase === 'playing' || phase === 'playingP2';

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <GameShell title="Word Grid" onBack={() => { stopTimer(); router.back(); }}
      status={isPlaying ? (
          <View style={[styles.timerContainer, {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.sm,
          }]}>
            <View style={styles.timerHeader}>
              <ThemedText variant="label" style={{ color: timerColor, fontWeight: '700' }}>
                {formatTime(timeRemaining)}{!isSinglePlayer ? ` · ${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}` : ''}
              </ThemedText>
              <ThemedText variant="label" style={{ color: theme.colors.text, fontWeight: '700' }}>
                Score: {currentScore}
              </ThemedText>
            </View>
            <View style={[styles.timerBarBackground, {
              backgroundColor: theme.colors.border,
              borderRadius: theme.borderRadius.sm,
            }]}>
              <View style={[styles.timerBarFill, {
                backgroundColor: timerColor,
                borderRadius: theme.borderRadius.sm,
                width: `${timerProgress * 100}%`,
              }]} />
            </View>
          </View>

      ) : undefined}>
      {/* ── Pass Device (2P) ────────────────────────────────────────────── */}
      {phase === 'passDevice' && (
        <View style={styles.centeredPhase}>
          <ThemedText variant="heading" style={styles.phaseTitle}>
            Player 1 finished!
          </ThemedText>
          <ThemedText
            variant="body"
            style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}
          >
            Score: {gameState?.scores.player1 ?? 0} points
          </ThemedText>
          <ThemedText
            variant="body"
            style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}
          >
            Pass the device to Player 2.{'\n'}Same board, 2 minutes.
          </ThemedText>
          <View style={{ marginTop: 24, width: '100%', maxWidth: 260 }}>
            <Button title="Ready" onPress={handlePassReady} variant="primary" size="lg" />
          </View>
        </View>
      )}

      {/* ── Playing ─────────────────────────────────────────────────────── */}
      {isPlaying && gameState && (
        <ScrollView
          contentContainerStyle={[
            styles.playContent,
            { paddingBottom: 16 },
          ]}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', flexDirection: shortLandscape ? 'row' : 'column', alignItems: 'center', gap: shortLandscape ? 16 : 0 }}>
          {/* Board grid */}
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(300)}>
          <ThemedBoardSurface style={[styles.boardContainer, {
              width: gridSize,
              backgroundColor: theme.colors.board,
              borderWidth: GRID_BORDER_WIDTH,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.lg,
              flexShrink: 0,
            }]}
          >
            {gameState.board.map((row, r) => (
              <View key={r} style={styles.boardRow}>
                {row.map((letter, c) => {
                  const pathIndex = highlightedPath.findIndex((p) => p.row === r && p.col === c);
                  const selected = pathIndex >= 0;
                  const isLast = selected && pathIndex === highlightedPath.length - 1;
                  return (
                  <GamePressable
                    key={`${r}-${c}`}
                    onPress={() => handleCellPress(r, c)}
                    disabled={isGameOver}
                    accessibilityRole="button"
                    accessibilityLabel={`Row ${r + 1}, column ${c + 1}: ${letter}${selected ? `, selected ${pathIndex + 1}` : ""}`}
                    accessibilityState={{ selected, disabled: isGameOver }}
                    style={{ width: cellSize, height: cellSize }}
                  >
                    {({ pressed }) => <LetterTile
                      variant="word-grid"
                      letter={letter}
                      size={cellSize}
                      state={selected ? 'selected' : 'neutral'}
                      pressed={pressed}
                      style={{ backgroundColor: isLast ? theme.colors.primary : selected ? theme.colors.primary + '30' : theme.colors.surfaceRaised, borderBottomWidth: selected ? 4 : 3 }}
                      textStyle={[styles.cellLetter, { color: isLast ? theme.colors.onPrimary : theme.colors.text, fontSize: Math.max(20, cellSize * 0.34) }]}
                    >
                    {selected && (
                      <ThemedText aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" variant="caption" style={{ position: 'absolute', top: 3, left: 5, color: isLast ? theme.colors.onPrimary : theme.colors.primary, fontWeight: '700' }}>{pathIndex + 1}</ThemedText>
                    )}
                    {letter.length > 1 && (
                      <View style={[styles.quBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                        <ThemedText variant="caption" style={{ color: isLast ? theme.colors.onPrimary : theme.colors.primary, fontSize: 8 }}>
                          2
                        </ThemedText>
                      </View>
                    )}
                    </LetterTile>}
                  </GamePressable>
                  );
                })}
              </View>
            ))}
            <SelectionTrail found={false} style={{ opacity: 0.28 }} points={highlightedPath.map(({ row, col }) => ({
              x: (GRID_PADDING + col * (cellSize + GRID_GAP) + cellSize / 2) / (gridSize - GRID_BORDER_WIDTH * 2),
              y: (GRID_PADDING + row * (cellSize + GRID_GAP) + cellSize / 2) / (gridSize - GRID_BORDER_WIDTH * 2),
            }))} />
          </ThemedBoardSurface>
          </Animated.View>

          <View style={{ alignSelf: 'stretch', flex: shortLandscape ? 1 : undefined, minWidth: 0 }}>
          {/* Word input */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Word to submit"
              value={currentInput}
              onChangeText={handleChangeText}
              placeholder="Type or tap letters..."
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isGameOver}
              onSubmitEditing={handleSubmitWord}
              returnKeyType="done"
              style={[styles.textInput, {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                fontFamily: theme.fonts.body,
              }]}
            />
            {currentInput.length > 0 && !isGameOver && (
              <GamePressable onPress={clearWord} hitSlop={8} accessibilityLabel="Clear word" style={styles.clearButton}>
                <ThemedText variant="body" style={{ color: theme.colors.textMuted }}>✕</ThemedText>
              </GamePressable>
            )}
            <View style={{ width: 80 }}>
              <Button
                title="Submit"
                onPress={handleSubmitWord}
                variant="primary"
                size="md"
                disabled={isGameOver || currentInput.trim().length === 0}
              />
            </View>
          </View>

          {/* Feedback */}
          <View style={{ minHeight: 44, width: '100%' }} accessibilityLiveRegion="polite">
          {feedback && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.duration(150)}
              style={[styles.feedbackContainer, {
                backgroundColor: feedback.isError
                  ? theme.colors.error + '18'
                  : theme.colors.success + '18',
                borderRadius: theme.borderRadius.sm,
              }]}
            >
              <ThemedText
                variant="label"
                style={{
                  color: feedback.isError ? theme.colors.error : theme.colors.success,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {feedback.isError ? `! ${feedback.text}` : `✓ ${feedback.text}`}
              </ThemedText>
            </Animated.View>
          )}

          </View>

          {/* Scoring reference */}
          <View style={[styles.scoringRef, {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.sm,
          }]}>
            <ThemedText variant="caption" style={{ color: theme.colors.textMuted }}>
              3-4 letters: 1pt {'  '} 5: 2pt {'  '} 6: 3pt {'  '} 7: 5pt {'  '} 8+: 11pt
            </ThemedText>
          </View>

          {/* Found words list */}
          {foundWordsArray.length > 0 && (
            <View style={[styles.foundWordsContainer, {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
            }]}>
              <ThemedText
                variant="label"
                style={[styles.foundWordsTitle, { color: theme.colors.textMuted }]}
              >
                Found Words ({foundWordsArray.length})
              </ThemedText>
              <View style={styles.foundWordsList}>
                {foundWordsArray.map((fw) => (
                  <View
                    key={fw.word}
                    style={[styles.foundWordChip, {
                      backgroundColor: theme.colors.primary + '15',
                      borderRadius: theme.borderRadius.sm,
                    }]}
                  >
                    <ThemedText variant="caption" style={{ color: theme.colors.text, fontWeight: '600' }}>
                      {fw.word}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 4 }}>
                      +{fw.score}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          </View>
          </View>

          {/* Time's up overlay */}
          {isGameOver && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.duration(300)}
              style={[styles.timesUpBanner, {
                backgroundColor: theme.colors.error + '15',
                borderRadius: theme.borderRadius.md,
              }]}
            >
              <ThemedText variant="heading" style={{ color: theme.colors.error, textAlign: 'center' }}>
                Time's Up!
              </ThemedText>
              {isSinglePlayer ? (
                <ThemedText variant="body" style={{ color: theme.colors.text, textAlign: 'center', marginTop: 4 }}>
                  Final Score: {gameState.scores.player1}
                </ThemedText>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <ThemedText variant="body" style={{ color: theme.colors.player1, textAlign: 'center' }}>
                    Player 1: {gameState.scores.player1}
                  </ThemedText>
                  <ThemedText variant="body" style={{ color: theme.colors.player2, textAlign: 'center' }}>
                    Player 2: {gameState.scores.player2}
                  </ThemedText>
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>
      )}

      {/* ── Game Over Modal ─────────────────────────────────────────────── */}
      <GameOverModal
        visible={showModal}
        result={getModalResult()}
        onRematch={handleRematch}
        onHome={handleHome}
        gameName="Word Grid"
      />
    </GameShell>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Phase screens
  centeredPhase: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  phaseTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  phaseSubtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },

  // Playing screen
  playContent: {
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 8,
  },

  // Timer
  timerContainer: {
    width: '100%',
    padding: 0,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timerBarBackground: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
  },

  // Board
  boardContainer: {
    padding: GRID_PADDING,
    marginBottom: 12,
    gap: GRID_GAP,
  },
  boardRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: 0,
  },
  cell: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clearButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  cellLetter: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  quBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderWidth: 2,
    paddingHorizontal: 8,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Feedback
  feedbackContainer: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  // Scoring reference
  scoringRef: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  // Found words
  foundWordsContainer: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
  },
  foundWordsTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  foundWordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  foundWordChip: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  // Time's up
  timesUpBanner: {
    width: '100%',
    padding: 20,
    marginBottom: 12,
  },
});

function GamePressable({ style, ...props }: React.ComponentProps<typeof Pressable>) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      {...(Platform.OS === 'web' && props.accessibilityState?.selected !== undefined
        ? { 'aria-pressed': props.accessibilityState.selected }
        : {})}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={(state) => [typeof style === 'function' ? style(state) : style, focus.style]}
    />
  );
}
