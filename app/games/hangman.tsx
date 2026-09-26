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
import { GameShell } from '../../src/components/ui/GameShell';
import { Card } from '../../src/components/ui/Card';
import { StatusRail } from '../../src/components/ui/StatusRail';
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
import { getHangmanStage } from '../../src/utils/hangmanStages';
import { useWebFocusRing } from '../../src/utils/useWebFocusRing';


// ─── QWERTY keyboard rows ───────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// ─── Hangman Figure ─────────────────────────────────────────────────────────
const HANGMAN_STAGE_IMAGES = [
  require('../../assets/pieces/hangman/hangman-0.webp'),
  require('../../assets/pieces/hangman/hangman-1.webp'),
  require('../../assets/pieces/hangman/hangman-2.webp'),
  require('../../assets/pieces/hangman/hangman-3.webp'),
  require('../../assets/pieces/hangman/hangman-4.webp'),
  require('../../assets/pieces/hangman/hangman-5.webp'),
  require('../../assets/pieces/hangman/hangman-6.webp'),
];

interface HangmanFigureProps {
  wrongGuesses: number;
  size: number;
}

function HangmanFigure({ wrongGuesses, size }: HangmanFigureProps) {
  const stage = getHangmanStage(wrongGuesses);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={HANGMAN_STAGE_IMAGES[stage]}
          accessibilityLabel={`Hangman stage ${stage} of 6`}
          testID={`hangman-stage-${stage}`}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
    </View>
  );
}

function LetterKey({ letter, guessed, correct, disabled, onPress }: {
  letter: string; guessed: boolean; correct: boolean; disabled: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  const color = guessed ? (correct ? theme.colors.success : theme.colors.error) : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={guessed ? `${letter}, ${correct ? 'correct' : 'incorrect'}` : letter}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [styles.key, {
        backgroundColor: guessed ? theme.colors.surfaceSunken : theme.colors.surfaceRaised,
        borderColor: guessed ? color : theme.colors.border,
        borderRadius: theme.borderRadius.md,
        opacity: disabled && !guessed ? 0.45 : pressed ? 0.75 : 1,
      }, focus.style]}
    >
      <ThemedText variant="label" style={{ color, fontSize: 17 }}>{letter}</ThemedText>
      {guessed && <ThemedText style={{ color, fontSize: 10, lineHeight: 11 }}>{correct ? '✓' : '×'}</ThemedText>}
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
type Phase = 'modeSelect' | 'wordEntry' | 'passDevice' | 'playing';

export default function HangmanScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth, height, isTablet } = useResponsive();
  // Shrinks on short/landscape screens so the word and keyboard stay in view.
  const figureSize = Math.min(contentWidth - 64, isTablet ? 280 : 200, Math.max(120, height * 0.24));

  // Mode & phase
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode] = useState<'single' | 'multiplayer'>(resolvedMode);
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
  }, [isSinglePlayer, difficulty]);

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

  const remaining = gameState ? gameState.maxWrongGuesses - gameState.wrongGuesses : 6;

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <GameShell title="Hangman" onBack={() => router.back()} contentMaxWidth={760}>
      <Stack.Screen
        options={{
          headerShown: false,
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
          <Card style={styles.setupCard}>
          <ThemedText variant="caption" style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: 12 }}>PASS & PLAY</ThemedText>
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
            accessibilityLabel="Secret word"
            onSubmitEditing={handleWordSubmit}
            style={[
              styles.textInput,
              {
                color: theme.colors.text,
                borderColor: wordError ? theme.colors.error : theme.colors.border,
                backgroundColor: theme.colors.surfaceSunken,
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
          </Card>
        </View>
      )}

      {/* ── 2P: Pass device ───────────────────────────────────────────── */}
      {phase === 'passDevice' && (
        <View style={styles.centeredPhase}>
          <Card style={styles.setupCard}>
          <ThemedText variant="caption" style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: 12 }}>YOUR WORD IS READY</ThemedText>
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
          </Card>
        </View>
      )}

      {/* ── Playing ───────────────────────────────────────────────────── */}
      {phase === 'playing' && gameState && (
        <ScrollView
          style={{ backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg }}
          contentContainerStyle={[
            styles.playContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <StatusRail style={{ width: '100%' }}>
            <ThemedText variant="label" style={{ textAlign: 'center' }}>
              {gameState.isGameOver ? (gameState.isWinner ? 'Word solved!' : 'No guesses left') : (isSinglePlayer ? 'Your turn to guess' : 'Player 2 · Your turn to guess')}
            </ThemedText>
          {isSinglePlayer && (
            <ThemedText variant="caption" style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 2 }}>
              Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </ThemedText>
          )}
          </StatusRail>

          {/* Hangman figure */}
          <View style={styles.figureWrapper}>
            <HangmanFigure
              wrongGuesses={gameState.wrongGuesses}
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
            {remaining} {remaining === 1 ? 'guess' : 'guesses'} remaining
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
                    backgroundColor: theme.colors.surfaceSunken,
                    borderColor: theme.colors.border,
                    borderRadius: theme.borderRadius.sm,
                    minWidth: 32,
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
            {KEYBOARD_ROWS.flat().map((letter) => {
                  const guessed = gameState.guessedLetters.has(letter);
                  return (
                    <LetterKey
                      key={letter}
                      letter={letter}
                      guessed={guessed}
                      correct={gameState.secretWord.includes(letter)}
                      onPress={() => handleLetterPress(letter)}
                      disabled={guessed || gameState.isGameOver}
                    />
                  );
            })}
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
    </GameShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Phase screens (word entry, pass device)
  centeredPhase: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  setupCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    paddingVertical: 32,
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
    paddingHorizontal: 4,
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
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingVertical: 8,
    paddingHorizontal: 4,
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
    maxWidth: 510,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  key: {
    width: 44,
    height: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
