import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
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
import {
  type HangmanSession,
  createHangmanSession,
  completeHangmanRound,
} from '../../src/engines/hangman-session';
import { selectWord } from '../../src/ai/hangman-ai';
import { DifficultySelector, type Difficulty } from '../../src/components/ui/DifficultySelector';
import { useResponsive } from '../../src/utils/layout';
import { GamePieceImage } from '../../src/components/game-visuals/GamePieceImage';
import { GAME_VISUALS } from '../../src/game-visuals/registry';
import { getHangmanStage } from '../../src/utils/hangmanStages';
import { useWebFocusRing } from '../../src/utils/useWebFocusRing';


// ─── QWERTY keyboard rows ───────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// ─── Hangman Figure ─────────────────────────────────────────────────────────
interface HangmanFigureProps {
  wrongGuesses: number;
  size: number;
}

function HangmanFigure({ wrongGuesses, size }: HangmanFigureProps) {
  const { themeName } = useTheme();
  const stage = getHangmanStage(wrongGuesses);

  return (
    <View accessibilityRole="image" accessibilityLabel={`Hangman stage ${stage} of 6; ${stage} of 6 incorrect guesses`} testID={`hangman-stage-${stage}`} style={{ alignItems: 'center' }}>
      <GamePieceImage source={GAME_VISUALS[themeName].hangman[getHangmanStage(wrongGuesses)]} size={size} />
      <ThemedText variant="caption">{stage} of 6 incorrect guesses</ThemedText>
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
type Phase = 'modeSelect' | 'nameSetup' | 'wordEntry' | 'passDevice' | 'playing';

export default function HangmanScreen() {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth, height, isTablet } = useResponsive();
  // Shrinks on short/landscape screens so the word and keyboard stay in view.
  const figureSize = Math.min(contentWidth - 64, isTablet ? 280 : 200, Math.max(120, height * 0.24));

  // Mode & phase
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [phase, setPhase] = useState<Phase>(resolvedMode === 'multiplayer' ? 'nameSetup' : 'modeSelect');
  const [showDifficultySelector, setShowDifficultySelector] = useState(resolvedMode === 'single');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [session, setSession] = useState<HangmanSession>(() => createHangmanSession('', ''));

  // 2P word entry
  const [enteredWord, setEnteredWord] = useState('');
  const [wordError, setWordError] = useState('');

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const resultRecordedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  const isSinglePlayer = mode === 'single';
  const completedSession = !isSinglePlayer && gameState?.isGameOver
    ? completeHangmanRound(session, gameState.isWinner)
    : null;
  const displayedWins = completedSession?.wins ?? session.wins;
  const scoreText = `Round ${session.round} · ${session.names.player1}: ${displayedWins.player1} wins · ${session.names.player2}: ${displayedWins.player2} wins`;

  const handleSessionStart = useCallback(() => {
    setSession(createHangmanSession(player1Name, player2Name));
    setPhase('wordEntry');
  }, [player1Name, player2Name]);

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
    setEnteredWord('');
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
    if (!gameState?.isGameOver) return;

    if (!resultRecordedRef.current) {
      resultRecordedRef.current = true;

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
        const winner = won ? session.guesser : session.setter;
        recordGameResult({
          game: 'hangman',
          mode: 'multiplayer',
          player: session.names[winner],
          score: 1,
          result: 'win',
          durationSeconds,
        });
      }
    }

    const timeout = setTimeout(() => setShowModal(true), 600);
    return () => clearTimeout(timeout);
  }, [gameState?.isGameOver, gameState?.isWinner, isSinglePlayer, session]);

  // ── Rematch / Home ──────────────────────────────────────────────────────
  const handleRematch = useCallback(() => {
    setShowModal(false);
    resultRecordedRef.current = false;
    setEnteredWord('');
    setWordError('');

    if (isSinglePlayer) {
      const word = selectWord(difficulty);
      setGameState(createGame(word));
      startTimeRef.current = Date.now();
      setPhase('playing');
    } else {
      if (!gameState?.isGameOver) return;
      setSession(completeHangmanRound(session, gameState.isWinner));
      setGameState(null);
      setPhase('wordEntry');
    }
  }, [isSinglePlayer, difficulty, gameState, session]);

  const handleHome = useCallback(() => {
    setShowModal(false);
    router.back();
  }, [router]);

  // ── Modal result ────────────────────────────────────────────────────────
  const getModalResult = () => {
    if (!gameState) return { winner: 'draw' as const };
    if (!isSinglePlayer) {
      return {
        winner: gameState.isWinner ? session.guesser : session.setter,
        score: displayedWins,
      };
    }
    if (gameState.isWinner) {
      // Guesser won
      return { winner: 'player1' as const };
    }
    // Guesser lost
    return { winner: 'player2' as const };
  };

  const playerNames = isSinglePlayer
    ? { player1: 'You', player2: 'AI' }
    : session.names;

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

      {/* ── 2P: Name setup ────────────────────────────────────────────── */}
      {phase === 'nameSetup' && (
        <ScrollView contentContainerStyle={styles.centeredPhase} keyboardShouldPersistTaps="handled">
          <Card style={styles.setupCard}>
            <ThemedText variant="heading" style={styles.phaseTitle}>Who's playing?</ThemedText>
            <ThemedText variant="body" style={styles.phaseSubtitle}>
              Take turns setting and guessing words. Wins carry over each round.
            </ThemedText>
            {[
              { label: 'Player 1 name', value: player1Name, onChangeText: setPlayer1Name, placeholder: 'Player 1' },
              { label: 'Player 2 name', value: player2Name, onChangeText: setPlayer2Name, placeholder: 'Player 2' },
            ].map((field) => (
              <View key={field.label} style={styles.nameField}>
                <ThemedText variant="label">{field.label}</ThemedText>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChangeText}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.colors.textMuted}
                  accessibilityLabel={field.label}
                  autoCapitalize="words"
                  autoCorrect={false}
                  onSubmitEditing={handleSessionStart}
                  style={[styles.nameInput, {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceSunken,
                    borderRadius: theme.borderRadius.md,
                    fontFamily: theme.fonts.body,
                  }]}
                />
              </View>
            ))}
            <View style={{ marginTop: 20, width: '100%', maxWidth: 280 }}>
              <Button title="Start" onPress={handleSessionStart} variant="primary" size="lg" />
            </View>
          </Card>
        </ScrollView>
      )}

      {/* ── 2P: Enter Word ────────────────────────────────────────────── */}
      {phase === 'wordEntry' && (
        <ScrollView contentContainerStyle={styles.centeredPhase} keyboardShouldPersistTaps="handled">
          <Card style={styles.setupCard}>
          <HangmanFigure wrongGuesses={0} size={120} />
          <ThemedText variant="caption" style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: 12 }}>PASS & PLAY</ThemedText>
          <ThemedText variant="heading" style={styles.phaseTitle}>
            {session.names[session.setter]}
          </ThemedText>
          <ThemedText
            variant="body"
            style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}
          >
            Enter a word for {session.names[session.guesser]} to guess
          </ThemedText>
          <ThemedText variant="caption" style={styles.sessionScore}>{scoreText}</ThemedText>

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
            accessibilityLabel={`Secret word from ${session.names[session.setter]} for ${session.names[session.guesser]}`}
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
        </ScrollView>
      )}

      {/* ── 2P: Pass device ───────────────────────────────────────────── */}
      {phase === 'passDevice' && (
        <ScrollView contentContainerStyle={styles.centeredPhase} keyboardShouldPersistTaps="handled">
          <Card style={styles.setupCard}>
          <HangmanFigure wrongGuesses={0} size={120} />
          <ThemedText variant="caption" style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: 12 }}>YOUR WORD IS READY</ThemedText>
          <ThemedText variant="heading" style={styles.phaseTitle}>
            Pass to {session.names[session.guesser]}
          </ThemedText>
          <ThemedText
            variant="body"
            style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}
          >
            Hand the device to {session.names[session.guesser]}, then tap Ready.
          </ThemedText>
          <ThemedText variant="caption" style={styles.sessionScore}>{scoreText}</ThemedText>
          <View style={{ marginTop: 24, width: '100%', maxWidth: 260 }}>
            <Button title="Ready" onPress={handlePassReady} variant="primary" size="lg" />
          </View>
          </Card>
        </ScrollView>
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
              {gameState.isGameOver ? (gameState.isWinner ? 'Word solved!' : 'No guesses left') : (isSinglePlayer ? 'Your turn to guess' : `${session.names[session.guesser]} · Your turn to guess`)}
            </ThemedText>
          {!isSinglePlayer && (
            <ThemedText variant="caption" style={styles.sessionScore}>{scoreText}</ThemedText>
          )}
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
            entering={reducedMotion ? undefined : FadeIn.duration(theme.animation.duration.medium)}
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
        primaryActionLabel={isSinglePlayer ? undefined : 'Next Round'}
      />
    </GameShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Phase screens (word entry, pass device)
  centeredPhase: {
    flexGrow: 1,
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
    width: '100%',
    textAlign: 'center',
    marginBottom: 8,
  },
  phaseSubtitle: {
    width: '100%',
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
  nameField: {
    width: '100%',
    maxWidth: 280,
    gap: 8,
    marginTop: 16,
  },
  nameInput: {
    height: 52,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 18,
  },
  sessionScore: {
    textAlign: 'center',
    marginVertical: 8,
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
