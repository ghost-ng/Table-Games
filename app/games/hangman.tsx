import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeProvider';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { recordGameResult } from '../../src/storage/scores';
import {
  type GameState,
  createGame,
  guessLetter,
} from '../../src/engines/hangman';
import { selectWord } from '../../src/ai/hangman-ai';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { useResponsive } from '../../src/utils/layout';


// ─── QWERTY keyboard rows ───────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// ─── Hangman Figure ─────────────────────────────────────────────────────────
// Pure image-based: each stage is a unique DALL-E illustration with correct progression
const HANGMAN_STAGES = [
  require('../../assets/pieces/hangman-1.webp'), // empty gallows
  require('../../assets/pieces/hangman-2.webp'), // head only
  require('../../assets/pieces/hangman-3.webp'), // head + body
  require('../../assets/pieces/hangman-4.webp'), // head + body + arms
  require('../../assets/pieces/hangman-5.webp'), // head + body + arms + 1 leg
  require('../../assets/pieces/hangman-6.webp'), // complete figure
];

interface HangmanFigureProps {
  wrongGuesses: number;
  color: string;
  gallowsColor: string;
  size: number;
}

function HangmanFigure({ wrongGuesses, size }: HangmanFigureProps) {
  const stageIndex = Math.min(wrongGuesses, 6) - 1;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {wrongGuesses > 0 && (
        <Image
          source={HANGMAN_STAGES[stageIndex]}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
type Phase = 'modeSelect' | 'wordEntry' | 'passDevice' | 'playing';

export default function HangmanScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth, contentMaxWidth, height, isTablet } = useResponsive();
  // Shrinks on short/landscape screens so the word and keyboard stay in view.
  const figureSize = Math.min(contentWidth - 64, isTablet ? 280 : 220, Math.max(140, height * 0.3));

  // Mode & phase
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [phase, setPhase] = useState<Phase>(resolvedMode === 'multiplayer' ? 'wordEntry' : 'modeSelect');
  const [showDifficultySelector, setShowDifficultySelector] = useState(resolvedMode === 'single');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // 2P word entry
  const [enteredWord, setEnteredWord] = useState('');
  const [wordError, setWordError] = useState('');

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);
  const startTimeRef = useRef(Date.now());

  const isSinglePlayer = mode === 'single';

  const handleDifficultySelect = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setShowDifficultySelector(false);
    const word = selectWord(d);
    setGameState(createGame(word));
    startTimeRef.current = Date.now();
    setPhase('playing');
  }, []);

  // ── 2P word submission ──────────────────────────────────────────────────
  const handleWordSubmit = useCallback(() => {
    const cleaned = enteredWord.trim().toUpperCase();
    if (cleaned.length < 2) {
      setWordError('Word must be at least 2 letters.');
      return;
    }
    if (!/^[A-Z]+$/.test(cleaned)) {
      setWordError('Only letters A-Z are allowed.');
      return;
    }
    setWordError('');
    setGameState(createGame(cleaned));
    setPhase('passDevice');
  }, [enteredWord]);

  const handlePassReady = useCallback(() => {
    startTimeRef.current = Date.now();
    setPhase('playing');
  }, []);

  // ── Letter press ────────────────────────────────────────────────────────
  const handleLetterPress = useCallback(
    (letter: string) => {
      if (!gameState || gameState.isGameOver) return;
      setGameState((prev) => (prev ? guessLetter(prev, letter) : prev));
    },
    [gameState],
  );

  // ── Game over handling ──────────────────────────────────────────────────
  useEffect(() => {
    if (gameState?.isGameOver && !resultRecorded) {
      setResultRecorded(true);

      const durationSeconds = Math.round(
        (Date.now() - startTimeRef.current) / 1000,
      );

      const won = gameState.isWinner;

      if (isSinglePlayer) {
        recordGameResult({
          game: 'hangman',
          mode: 'single',
          player: 'Player',
          score: won ? 1 : 0,
          result: won ? 'win' : 'loss',
          durationSeconds,
        });
      } else {
        // In 2P the guesser is player2; record from player2's perspective
        recordGameResult({
          game: 'hangman',
          mode: 'multiplayer',
          player: 'Player 2',
          score: won ? 1 : 0,
          result: won ? 'win' : 'loss',
          durationSeconds,
        });
      }

      const timeout = setTimeout(() => setShowModal(true), 600);
      return () => clearTimeout(timeout);
    }
  }, [gameState?.isGameOver]);

  // ── Rematch / Home ──────────────────────────────────────────────────────
  const handleRematch = useCallback(() => {
    setShowModal(false);
    setResultRecorded(false);
    setEnteredWord('');
    setWordError('');

    if (isSinglePlayer) {
      const word = selectWord(difficulty);
      setGameState(createGame(word));
      startTimeRef.current = Date.now();
      setPhase('playing');
    } else {
      setGameState(null);
      setPhase('wordEntry');
    }
  }, [isSinglePlayer]);

  const handleHome = useCallback(() => {
    setShowModal(false);
    router.back();
  }, [router]);

  // ── Modal result ────────────────────────────────────────────────────────
  const getModalResult = () => {
    if (!gameState) return { winner: 'draw' as const };
    if (gameState.isWinner) {
      // Guesser won
      return { winner: isSinglePlayer ? ('player1' as const) : ('player2' as const) };
    }
    // Guesser lost
    return { winner: isSinglePlayer ? ('player2' as const) : ('player1' as const) };
  };

  const playerNames = isSinglePlayer
    ? { player1: 'You', player2: 'AI' }
    : { player1: 'Player 1', player2: 'Player 2' };

  // ── Render helpers ──────────────────────────────────────────────────────
  const getLetterColor = (letter: string) => {
    if (!gameState) return undefined;
    if (!gameState.guessedLetters.has(letter)) return undefined;
    return gameState.secretWord.includes(letter)
      ? theme.colors.success
      : theme.colors.error;
  };

  const isLetterDisabled = (letter: string) => {
    if (!gameState) return true;
    return gameState.guessedLetters.has(letter) || gameState.isGameOver;
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, maxWidth: contentMaxWidth }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Hangman',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Animated.Text style={{ color: theme.colors.text, fontSize: 16 }}>
                ← Back
              </Animated.Text>
            </Pressable>
          ),
        }}
      />

      {/* ── Difficulty Selector ────────────────────────────────────────── */}
      <DifficultySelector
        visible={showDifficultySelector}
        onSelect={handleDifficultySelect}
        onClose={() => router.back()}
        gameName="Hangman"
      />

      {/* ── 2P: Enter Word ────────────────────────────────────────────── */}
      {phase === 'wordEntry' && (
        <View style={styles.centeredPhase}>
          <ThemedText variant="heading" style={styles.phaseTitle}>
            Player 1
          </ThemedText>
          <ThemedText
            variant="body"
            style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}
          >
            Enter a word for Player 2 to guess
          </ThemedText>

          <TextInput
            value={enteredWord}
            onChangeText={(t) => {
              setEnteredWord(t);
              setWordError('');
            }}
            placeholder="Secret word..."
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            secureTextEntry
            style={[
              styles.textInput,
              {
                color: theme.colors.text,
                borderColor: wordError ? theme.colors.error : theme.colors.border,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                fontFamily: theme.fonts.body,
              },
            ]}
          />

          {wordError !== '' && (
            <ThemedText
              variant="caption"
              style={{ color: theme.colors.error, marginTop: 4 }}
            >
              {wordError}
            </ThemedText>
          )}

          <View style={{ marginTop: 20, width: '100%', maxWidth: 260 }}>
            <Button title="Submit" onPress={handleWordSubmit} variant="primary" size="lg" />
          </View>
        </View>
      )}

      {/* ── 2P: Pass device ───────────────────────────────────────────── */}
      {phase === 'passDevice' && (
        <View style={styles.centeredPhase}>
          <ThemedText variant="heading" style={styles.phaseTitle}>
            Pass to Player 2
          </ThemedText>
          <ThemedText
            variant="body"
            style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}
          >
            Hand the device to Player 2, then tap Ready.
          </ThemedText>
          <View style={{ marginTop: 24, width: '100%', maxWidth: 260 }}>
            <Button title="Ready" onPress={handlePassReady} variant="primary" size="lg" />
          </View>
        </View>
      )}

      {/* ── Playing ───────────────────────────────────────────────────── */}
      {phase === 'playing' && gameState && (
        <ScrollView
          contentContainerStyle={[
            styles.playContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          bounces={false}
        >
          {/* Turn indicator */}
          {!gameState.isGameOver && (
            <TurnIndicator
              currentPlayer="player2"
              playerNames={
                isSinglePlayer
                  ? { player1: 'AI', player2: 'You' }
                  : { player1: 'Player 1', player2: 'Player 2' }
              }
            />
          )}
          {isSinglePlayer && (
            <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
              Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </ThemedText>
          )}

          {/* Hangman figure */}
          <View style={styles.figureWrapper}>
            <HangmanFigure
              wrongGuesses={gameState.wrongGuesses}
              color={theme.colors.error}
              gallowsColor={theme.colors.textMuted}
              size={figureSize}
            />
          </View>

          {/* Remaining guesses */}
          <ThemedText
            variant="label"
            style={[
              styles.remainingText,
              {
                color:
                  gameState.wrongGuesses >= 4
                    ? theme.colors.error
                    : theme.colors.textMuted,
              },
            ]}
          >
            {gameState.maxWrongGuesses - gameState.wrongGuesses} guesses remaining
          </ThemedText>

          {/* Word display */}
          <Animated.View
            entering={FadeIn.duration(theme.animation.duration.medium)}
            style={styles.wordRow}
          >
            {gameState.displayWord.map((ch, idx) => (
              <View
                key={idx}
                style={[
                  styles.letterBlank,
                  {
                    borderBottomColor:
                      ch === '_' ? theme.colors.border : theme.colors.primary,
                    minWidth: Math.min(36, (contentWidth - 64) / gameState.secretWord.length - 6),
                  },
                ]}
              >
                <ThemedText
                  variant="heading"
                  style={[
                    styles.letterChar,
                    {
                      color: gameState.isGameOver && ch === '_'
                        ? theme.colors.error
                        : theme.colors.text,
                    },
                  ]}
                >
                  {gameState.isGameOver && ch === '_'
                    ? gameState.secretWord[idx]
                    : ch === '_'
                    ? ' '
                    : ch}
                </ThemedText>
              </View>
            ))}
          </Animated.View>

          {/* Game over word reveal label */}
          {gameState.isGameOver && !gameState.isWinner && (
            <ThemedText
              variant="caption"
              style={{ color: theme.colors.error, marginTop: 4, textAlign: 'center' }}
            >
              The word was: {gameState.secretWord}
            </ThemedText>
          )}

          {/* Keyboard */}
          <View style={styles.keyboard}>
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.keyboardRow}>
                {row.map((letter) => {
                  const guessed = gameState.guessedLetters.has(letter);
                  const letterColor = getLetterColor(letter);
                  const disabled = isLetterDisabled(letter);

                  return (
                    <Pressable
                      key={letter}
                      onPress={() => handleLetterPress(letter)}
                      disabled={disabled}
                      style={[
                        styles.key,
                        {
                          backgroundColor: guessed
                            ? letterColor
                              ? letterColor + '30'
                              : theme.colors.surface
                            : theme.colors.surface,
                          borderColor: guessed
                            ? letterColor ?? theme.colors.border
                            : theme.colors.border,
                          borderRadius: theme.borderRadius.sm,
                          opacity: disabled && !guessed ? 0.4 : 1,
                          ...theme.shadows.sm,
                        },
                      ]}
                    >
                      <ThemedText
                        variant="label"
                        style={{
                          color: guessed
                            ? letterColor ?? theme.colors.textMuted
                            : theme.colors.text,
                          fontWeight: '700',
                          fontSize: 16,
                        }}
                      >
                        {letter}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Game Over Modal ───────────────────────────────────────────── */}
      <GameOverModal
        visible={showModal}
        result={getModalResult()}
        onRematch={handleRematch}
        onHome={handleHome}
        gameName="Hangman"
        playerNames={playerNames}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center' as const,
    width: '100%' as const,
  },
  backButton: {
    padding: 8,
    marginLeft: -4,
  },

  // Phase screens (word entry, pass device)
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
    marginBottom: 16,
  },
  textInput: {
    width: '100%',
    maxWidth: 280,
    height: 52,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },

  // Playing screen
  playContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  figureWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  remainingText: {
    textAlign: 'center',
    marginBottom: 8,
  },

  // Word display
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginVertical: 12,
    gap: 6,
  },
  letterBlank: {
    borderBottomWidth: 3,
    paddingBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterChar: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Keyboard
  keyboard: {
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  key: {
    width: 34,
    height: 42,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
