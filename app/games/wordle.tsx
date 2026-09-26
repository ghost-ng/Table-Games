import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GameShell } from '../../src/components/ui/GameShell';
import { StatusRail } from '../../src/components/ui/StatusRail';
import { useWebFocusRing } from '../../src/utils/useWebFocusRing';
import Animated, { FadeIn, FlipInXDown, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeProvider';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { Button } from '../../src/components/ui/Button';
import { recordGameResult } from '../../src/storage/scores';
import {
  type GameState,
  type LetterState,
  MAX_GUESSES,
  WORD_LENGTH,
  createGame,
  getKeyboardStates,
  submitGuess,
} from '../../src/engines/wordle';
import { isValidWordleGuess, randomWordleAnswer } from '../../src/data/wordle-words';
import { useBoardFit, useResponsive } from '../../src/utils/layout';
import { haptics } from '../../src/utils/haptics';

type Phase = 'wordEntry' | 'passDevice' | 'playing';
type PlayerId = 'player1' | 'player2';

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const TILE_GAP = 6;
const KEY_GAP = 5;
const PLAYER_LABEL: Record<PlayerId, string> = { player1: 'Player 1', player2: 'Player 2' };

export default function WordleScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { contentWidth, height, isLandscape } = useResponsive();
  // Short landscape screens (phones on their side) can't stack grid + keyboard,
  // so they sit side by side: grid on the left, keyboard on the right.
  const sideBySide = isLandscape && height < 560;
  // 6 rows × 5 columns plus gaps: height ≈ 1.21 × width.
  const { onLayout: onGridAreaLayout, size: gridWidth } = useBoardFit({
    aspectRatio: 1.21,
    maxSize: 420,
    inset: 8,
    minSize: 120,
  });
  const tileSize = (gridWidth - TILE_GAP * (WORD_LENGTH - 1)) / WORD_LENGTH;
  const keyboardWidth = sideBySide ? (contentWidth - 24) * 0.62 : contentWidth - 24;
  const keyWidth = Math.min(48, (keyboardWidth - 16 - KEY_GAP * 9) / 10);
  const keyHeight = sideBySide
    ? 44
    : height <= 640
      ? 44
      : 54;

  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const isSinglePlayer = modeParam !== 'multiplayer';

  const [phase, setPhase] = useState<Phase>(isSinglePlayer ? 'playing' : 'wordEntry');
  // Pass-and-play: one player sets the word, the other guesses; roles swap each rematch.
  const [setter, setSetter] = useState<PlayerId>('player1');
  const guesser: PlayerId = setter === 'player1' ? 'player2' : 'player1';
  const [secretInput, setSecretInput] = useState('');
  const [secretError, setSecretError] = useState('');

  const [gameState, setGameState] = useState<GameState>(() => createGame(randomWordleAnswer()));
  const [currentGuess, setCurrentGuess] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(Date.now());
  const recordedRef = useRef(false);

  const keyStates = useMemo(() => getKeyboardStates(gameState), [gameState]);

  const showMessage = useCallback((text: string) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage(text);
    messageTimeoutRef.current = setTimeout(() => setMessage(null), 1800);
  }, []);

  useEffect(
    () => () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    },
    [],
  );

  // ── Input ────────────────────────────────────────────────────────────────
  const handleKey = useCallback(
    (key: string) => {
      if (phase !== 'playing' || gameState.isGameOver) return;

      if (key === 'ENTER') {
        if (currentGuess.length < WORD_LENGTH) {
          haptics.error();
          showMessage('Not enough letters');
          return;
        }
        if (!isValidWordleGuess(currentGuess)) {
          haptics.error();
          showMessage('Not in word list');
          return;
        }
        const next = submitGuess(gameState, currentGuess);
        setGameState(next);
        setCurrentGuess('');
        if (next.isWon) haptics.success();
        else haptics.light();
        return;
      }

      if (key === 'BACK') {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        haptics.selection();
        setCurrentGuess((g) => (g.length < WORD_LENGTH ? g + key : g));
      }
    },
    [phase, gameState, currentGuess, showMessage],
  );

  // Physical keyboard on web (desktop, tablets with keyboards).
  useEffect(() => {
    if (Platform.OS !== 'web' || phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Enter') handleKey('ENTER');
      else if (e.key === 'Backspace') handleKey('BACK');
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [phase, handleKey]);

  // ── Game over: record the result once ───────────────────────────────────
  useEffect(() => {
    if (!gameState.isGameOver || recordedRef.current) return;
    recordedRef.current = true;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const score = gameState.isWon ? MAX_GUESSES + 1 - gameState.guesses.length : 0;

    if (isSinglePlayer) {
      recordGameResult({
        game: 'wordle',
        mode: 'single',
        player: 'Player',
        score,
        result: gameState.isWon ? 'win' : 'loss',
        durationSeconds,
      });
    } else {
      // One record per game (like the other games): the winner of the round.
      recordGameResult({
        game: 'wordle',
        mode: 'multiplayer',
        player: PLAYER_LABEL[gameState.isWon ? guesser : setter],
        score,
        result: 'win',
        durationSeconds,
      });
    }
  }, [gameState, isSinglePlayer, guesser, setter]);

  // ── Round management ────────────────────────────────────────────────────
  const startRound = useCallback((answer: string) => {
    setGameState(createGame(answer));
    setCurrentGuess('');
    setMessage(null);
    recordedRef.current = false;
    startTimeRef.current = Date.now();
  }, []);

  const handleSecretSubmit = useCallback(() => {
    const word = secretInput.trim().toUpperCase();
    if (!/^[A-Z]{5}$/.test(word)) {
      setSecretError('Enter exactly 5 letters.');
      return;
    }
    if (!isValidWordleGuess(word)) {
      setSecretError('That word isn’t in the word list.');
      return;
    }
    setSecretError('');
    setSecretInput('');
    startRound(word);
    setPhase('passDevice');
  }, [secretInput, startRound]);

  const handlePlayAgain = useCallback(() => {
    if (isSinglePlayer) {
      startRound(randomWordleAnswer(gameState.answer));
      return;
    }
    setSetter(guesser);
    setPhase('wordEntry');
  }, [isSinglePlayer, startRound, gameState.answer, guesser]);

  // ── Colours ─────────────────────────────────────────────────────────────
  const stateColor = (state: LetterState) =>
    state === 'correct'
      ? theme.colors.success
      : state === 'present'
        ? theme.colors.warning
        : theme.colors.textMuted;

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderTile = (row: number, col: number) => {
    const submitted = row < gameState.guesses.length;
    const isCurrentRow = row === gameState.guesses.length && !gameState.isGameOver;
    const letter = submitted
      ? gameState.guesses[row][col]
      : isCurrentRow
        ? currentGuess[col] ?? ''
        : '';
    const evaluation = submitted ? gameState.evaluations[row][col] : null;
    const tileStyle = [
      styles.tile,
      {
        width: tileSize,
        height: tileSize,
        borderRadius: theme.borderRadius.sm,
        borderColor: evaluation
          ? stateColor(evaluation)
          : letter
            ? theme.colors.text
            : theme.colors.border,
        backgroundColor: evaluation ? stateColor(evaluation) : theme.colors.surface,
      },
    ];
    const text = (
      <ThemedText
        variant="heading"
        style={[
          styles.tileLetter,
          { fontSize: tileSize * 0.5, color: evaluation ? (theme.name === 'arcade' ? theme.colors.background : theme.colors.onPrimary) : theme.colors.text },
        ]}
      >
        {letter}
      </ThemedText>
    );

    if (evaluation) {
      // Keyed on evaluation so the tile remounts and flips when its row is revealed.
      return (
        <Animated.View
          key={`${row}-${col}-done`}
          entering={reducedMotion ? undefined : FlipInXDown.delay(col * 140).duration(280)}
          style={tileStyle}
          accessibilityLabel={`Guess ${row + 1}, letter ${col + 1}: ${letter}, ${evaluation}`}
        >
          {text}
          <ThemedText variant="caption" style={{ position: 'absolute', bottom: 1, fontSize: Math.max(9, tileSize * 0.18), color: theme.name === 'arcade' ? theme.colors.background : theme.colors.onPrimary }}>
            {evaluation === 'correct' ? '✓' : evaluation === 'present' ? '•' : '×'}
          </ThemedText>
        </Animated.View>
      );
    }
    if (letter) {
      return (
        <Animated.View key={`${row}-${col}-${letter}`} entering={reducedMotion ? undefined : ZoomIn.duration(110)} style={tileStyle}>
          {text}
        </Animated.View>
      );
    }
    return <View key={`${row}-${col}-empty`} style={tileStyle} />;
  };

  const renderKey = (key: string) => {
    const wide = key === 'ENTER' || key === 'BACK';
    const state = keyStates[key];
    return (
      <GamePressable
        key={key}
        onPress={() => handleKey(key)}
        accessibilityRole="button"
        accessibilityLabel={`${key === 'BACK' ? 'Delete' : key === 'ENTER' ? 'Enter' : key}${state ? `, ${state}` : ''}`}
        accessibilityState={{ disabled: gameState.isGameOver }}
        disabled={gameState.isGameOver}
        style={({ pressed }) => [
          styles.key,
          {
            width: wide ? keyWidth * 1.5 + KEY_GAP / 2 : keyWidth,
            height: keyHeight,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: state ? stateColor(state) : theme.colors.surface,
            borderColor: state ? stateColor(state) : theme.colors.border,
            opacity: pressed ? 0.7 : 1,
            borderBottomWidth: state ? 3 : 1,
          },
        ]}
      >
        <ThemedText
          variant="body"
          style={[
            styles.keyLabel,
            {
              color: state ? (theme.name === 'arcade' ? theme.colors.background : theme.colors.onPrimary) : theme.colors.text,
              fontSize: wide ? 10 : 14,
            },
          ]}
        >
          {key === 'BACK' ? 'DEL' : key}

        </ThemedText>
        {state ? <ThemedText variant="caption" style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 9, color: theme.name === 'arcade' ? theme.colors.background : theme.colors.onPrimary }}>{state === 'correct' ? '✓' : state === 'present' ? '•' : '×'}</ThemedText> : null}
      </GamePressable>
    );
  };

  const statusText = isSinglePlayer
    ? 'Guess the 5-letter word'
    : `${PLAYER_LABEL[guesser]} is guessing`;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <GameShell title="Word Guess" onBack={() => router.back()}>
      {/* ── Pass-and-play: set the secret word ─────────────────────────── */}
      {phase === 'wordEntry' && (
        <View style={styles.centeredPhase}>
          <ThemedText variant="heading" style={styles.phaseTitle}>
            {PLAYER_LABEL[setter]}
          </ThemedText>
          <ThemedText variant="body" style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}>
            Enter a 5-letter word for {PLAYER_LABEL[guesser]} to guess
          </ThemedText>
          <TextInput
            value={secretInput}
            accessibilityLabel="Secret five-letter word"
            onChangeText={(t) => {
              setSecretInput(t.replace(/[^a-zA-Z]/g, '').slice(0, WORD_LENGTH));
              setSecretError('');
            }}
            onSubmitEditing={handleSecretSubmit}
            placeholder="Secret word..."
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            secureTextEntry
            maxLength={WORD_LENGTH}
            style={[
              styles.textInput,
              {
                color: theme.colors.text,
                borderColor: secretError ? theme.colors.error : theme.colors.border,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                fontFamily: theme.fonts.body,
              },
            ]}
          />
          {secretError !== '' && (
            <ThemedText variant="caption" style={{ color: theme.colors.error, marginTop: 4 }}>
              {secretError}
            </ThemedText>
          )}
          <View style={styles.phaseButton}>
            <Button title="Submit" onPress={handleSecretSubmit} variant="primary" size="lg" />
          </View>
        </View>
      )}

      {/* ── Pass-and-play: hand over ───────────────────────────────────── */}
      {phase === 'passDevice' && (
        <View style={styles.centeredPhase}>
          <ThemedText variant="heading" style={styles.phaseTitle}>
            Pass to {PLAYER_LABEL[guesser]}
          </ThemedText>
          <ThemedText variant="body" style={[styles.phaseSubtitle, { color: theme.colors.textMuted }]}>
            Hand the device to {PLAYER_LABEL[guesser]}, then tap Ready.
          </ThemedText>
          <View style={styles.phaseButton}>
            <Button
              title="Ready"
              onPress={() => {
                startTimeRef.current = Date.now();
                setPhase('playing');
              }}
              variant="primary"
              size="lg"
            />
          </View>
        </View>
      )}

      {/* ── Playing ───────────────────────────────────────────────────── */}
      {phase === 'playing' && (
        <>
          <StatusRail style={{ minHeight: sideBySide ? 40 : 48, padding: 8 }}>
          <ThemedText variant="caption" style={[styles.status, { color: theme.colors.textMuted }]}>
            {statusText} · {gameState.guesses.length}/{MAX_GUESSES}
          </ThemedText>

          </StatusRail>

          {/* Toast (space is always reserved so the grid doesn't resize) */}
          <View style={styles.messageRow} accessibilityLiveRegion="polite">
            {message && (
              <Animated.View
                entering={reducedMotion ? undefined : FadeIn.duration(120)}
                style={[styles.message, { backgroundColor: theme.colors.text, borderRadius: theme.borderRadius.sm }]}
              >
                <ThemedText variant="label" style={{ color: theme.colors.background, fontWeight: '700' }}>
                  {message}
                </ThemedText>
              </Animated.View>
            )}
          </View>

          <View style={[styles.playArea, { flexDirection: sideBySide ? 'row' : 'column' }]}>
          <View style={styles.gridArea} onLayout={onGridAreaLayout}>
            <View style={{ gap: TILE_GAP }}>
              {Array.from({ length: MAX_GUESSES }, (_, row) => (
                <View key={row} style={[styles.gridRow, { gap: TILE_GAP }]}>
                  {Array.from({ length: WORD_LENGTH }, (_, col) => renderTile(row, col))}
                </View>
              ))}
            </View>
          </View>

          {gameState.isGameOver ? (
            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.duration(250).delay(700)}
              style={[styles.resultPanel, sideBySide && { width: keyboardWidth, justifyContent: 'center' }]}
            >
              <ThemedText
                variant="heading"
                style={[styles.resultTitle, { color: gameState.isWon ? theme.colors.success : theme.colors.error }]}
              >
                {gameState.isWon
                  ? `${isSinglePlayer ? 'Solved' : `${PLAYER_LABEL[guesser]} solved it`} in ${gameState.guesses.length}/${MAX_GUESSES}!`
                  : isSinglePlayer
                    ? 'Out of guesses'
                    : `${PLAYER_LABEL[setter]} wins!`}
              </ThemedText>
              <ThemedText variant="body" style={{ color: theme.colors.textMuted, textAlign: 'center' }}>
                The word was <ThemedText variant="body" style={{ fontWeight: '700', color: theme.colors.text }}>{gameState.answer}</ThemedText>
              </ThemedText>
              <View style={styles.resultButtons}>
                <View style={styles.resultButton}>
                  <Button title="Home" onPress={() => router.back()} variant="secondary" size="md" />
                </View>
                <View style={styles.resultButton}>
                  <Button
                    title={isSinglePlayer ? 'New Word' : 'Swap & Play'}
                    onPress={handlePlayAgain}
                    variant="primary"
                    size="md"
                  />
                </View>
              </View>
            </Animated.View>
          ) : (
            <View style={[styles.keyboard, { gap: KEY_GAP }, sideBySide && { width: keyboardWidth, justifyContent: 'center' }]}>
              {KEY_ROWS.map((row, i) => (
                <View key={row} style={[styles.keyRow, { gap: KEY_GAP }]}>
                  {i === 2 && renderKey('ENTER')}
                  {row.split('').map(renderKey)}
                  {i === 2 && renderKey('BACK')}
                </View>
              ))}
            </View>
          )}
          </View>
        </>
      )}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  status: {
    textAlign: 'center',
  },
  messageRow: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  playArea: {
    flex: 1,
  },
  gridArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  tile: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLetter: {
    fontWeight: '700',
    textAlign: 'center',
  },
  keyboard: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  key: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontWeight: '700',
  },
  resultPanel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 6,
  },
  resultTitle: {
    textAlign: 'center',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    width: '100%',
  },
  resultButton: {
    flex: 1,
    minWidth: 0,
  },
  centeredPhase: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  phaseTitle: {
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  phaseSubtitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    maxWidth: 260,
    height: 52,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
  },
  phaseButton: {
    marginTop: 20,
    width: '100%',
    maxWidth: 260,
  },
});

function GamePressable({ style, ...props }: React.ComponentProps<typeof Pressable>) {
  const { theme } = useTheme();
  const focus = useWebFocusRing(theme.colors.focus);
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={(state) => [typeof style === 'function' ? style(state) : style, focus.style]}
    />
  );
}
