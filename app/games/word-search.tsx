import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeProvider';
import { TurnIndicator } from '../../src/components/ui/TurnIndicator';
import { GameOverModal } from '../../src/components/ui/GameOverModal';
import { Button } from '../../src/components/ui/Button';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { recordGameResult } from '../../src/storage/scores';
import { useResponsive } from '../../src/utils/layout';

// ─── Constants ──────────────────────────────────────────────────────────────
const GRID_SIZE = 10;
const WORD_COUNT = 8;

// ─── Embedded Word List (~50 common 4-8 letter words) ───────────────────────
const WORD_BANK: string[] = [
  'APPLE', 'BEACH', 'BRAVE', 'CANDY', 'CHAIR',
  'CLOUD', 'DANCE', 'DREAM', 'EAGLE', 'FLAME',
  'FROST', 'GRAPE', 'GREEN', 'HEART', 'HOUSE',
  'IVORY', 'JEWEL', 'KNIFE', 'LEMON', 'LIGHT',
  'MAPLE', 'MUSIC', 'NIGHT', 'OCEAN', 'PAINT',
  'PEARL', 'PIZZA', 'PLANT', 'QUEEN', 'RIVER',
  'ROBOT', 'SHARK', 'SMILE', 'SNAKE', 'SOLAR',
  'SPACE', 'STORM', 'SUGAR', 'SWORD', 'TABLE',
  'TIGER', 'TOAST', 'TOWER', 'TRAIN', 'TRUCK',
  'TULIP', 'UNITY', 'VOICE', 'WHALE', 'ZEBRA',
];

// ─── Direction vectors: right, down, down-right, down-left ──────────────────
type Direction = [number, number];
const DIRECTIONS: Direction[] = [
  [0, 1],   // horizontal right
  [1, 0],   // vertical down
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface PlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
  cells: [number, number][];
}

interface Puzzle {
  grid: string[][];
  words: PlacedWord[];
}

interface FoundWord {
  word: string;
  player: 'player1' | 'player2';
  cells: [number, number][];
}

// ─── Puzzle Generator ───────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: Direction
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dir[0] * i;
    const c = col + dir[1] * i;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: Direction
): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < word.length; i++) {
    const r = row + dir[0] * i;
    const c = col + dir[1] * i;
    grid[r][c] = word[i];
    cells.push([r, c]);
  }
  return cells;
}

function generatePuzzle(): Puzzle {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill('')
  );

  const shuffled = shuffleArray(WORD_BANK);
  const placed: PlacedWord[] = [];

  for (const word of shuffled) {
    if (placed.length >= WORD_COUNT) break;
    if (word.length > GRID_SIZE) continue;

    // Try random placements
    const dirs = shuffleArray([...DIRECTIONS]);
    let didPlace = false;

    for (const dir of dirs) {
      if (didPlace) break;

      // Build list of valid positions for this direction
      const positions: [number, number][] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlace(grid, word, r, c, dir)) {
            positions.push([r, c]);
          }
        }
      }

      if (positions.length > 0) {
        const [sr, sc] = positions[Math.floor(Math.random() * positions.length)];
        const cells = placeWord(grid, word, sr, sc, dir);
        placed.push({ word, startRow: sr, startCol: sc, direction: dir, cells });
        didPlace = true;
      }
    }
  }

  // Fill remaining empty cells with random letters
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = LETTERS[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, words: placed };
}

// ─── Selection Helpers ──────────────────────────────────────────────────────
function cellsFormStraightLine(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): boolean {
  const dr = r2 - r1;
  const dc = c2 - c1;
  // Same cell
  if (dr === 0 && dc === 0) return false;
  // Horizontal, vertical, or 45-degree diagonal
  return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
}

function getCellsBetween(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): [number, number][] {
  const dr = r2 - r1;
  const dc = c2 - c1;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return [];

  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

  const cells: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push([r1 + stepR * i, c1 + stepC * i]);
  }
  return cells;
}

function getWordFromCells(grid: string[][], cells: [number, number][]): string {
  return cells.map(([r, c]) => grid[r][c]).join('');
}

// ─── Timer Formatting ───────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function WordSearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth, contentMaxWidth, height, isTablet } = useResponsive();

  // Mode & game state
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(() => generatePuzzle());
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'player1' | 'player2'>('player1');
  const [showGameOver, setShowGameOver] = useState(false);

  // Selection state: tap start cell, then tap end cell
  const [selStart, setSelStart] = useState<[number, number] | null>(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSinglePlayer = mode === 'single';

  // Derived: which cells are found and by whom
  const foundCellMap = useMemo(() => {
    const map = new Map<string, 'player1' | 'player2'>();
    for (const fw of foundWords) {
      for (const [r, c] of fw.cells) {
        // First finder gets the color on shared cells
        const key = `${r},${c}`;
        if (!map.has(key)) {
          map.set(key, fw.player);
        }
      }
    }
    return map;
  }, [foundWords]);

  const foundWordSet = useMemo(
    () => new Set(foundWords.map((fw) => fw.word)),
    [foundWords]
  );

  const isGameOver = puzzle !== null && foundWords.length === puzzle.words.length;

  // ── Timer effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (puzzle && !isGameOver) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [puzzle, isGameOver]);

  // ── Game over effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isGameOver || !puzzle) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const durationSeconds = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );

    if (isSinglePlayer) {
      recordGameResult({
        game: 'word-search',
        mode: 'single',
        player: 'Player',
        score: foundWords.length,
        result: 'win',
        durationSeconds,
      });
    } else {
      const p1Count = foundWords.filter((fw) => fw.player === 'player1').length;
      const p2Count = foundWords.filter((fw) => fw.player === 'player2').length;

      const winner =
        p1Count > p2Count ? 'Player 1' : p2Count > p1Count ? 'Player 2' : 'Draw';

      if (winner === 'Draw') {
        recordGameResult({
          game: 'word-search',
          mode: 'multiplayer',
          player: 'Player 1',
          score: p1Count,
          result: 'draw',
          durationSeconds,
        });
      } else {
        recordGameResult({
          game: 'word-search',
          mode: 'multiplayer',
          player: winner,
          score: winner === 'Player 1' ? p1Count : p2Count,
          result: 'win',
          durationSeconds,
        });
      }
    }

    const timeout = setTimeout(() => setShowGameOver(true), 600);
    return () => clearTimeout(timeout);
  }, [isGameOver]);

  // ── Cell tap ──────────────────────────────────────────────────────────────
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (!puzzle || isGameOver) return;

      if (selStart === null) {
        // First tap: set start
        setSelStart([row, col]);
        return;
      }

      const [sr, sc] = selStart;

      // Tapping the same cell cancels selection
      if (sr === row && sc === col) {
        setSelStart(null);
        return;
      }

      // Validate straight line
      if (!cellsFormStraightLine(sr, sc, row, col)) {
        // Not a valid line; reset and start new selection from this cell
        setSelStart([row, col]);
        return;
      }

      const cells = getCellsBetween(sr, sc, row, col);
      const selectedWord = getWordFromCells(puzzle.grid, cells);
      // Also check reverse
      const reversedWord = selectedWord.split('').reverse().join('');

      // Check if it matches any unfound word
      let matchedPlacedWord: PlacedWord | null = null;
      for (const pw of puzzle.words) {
        if (foundWordSet.has(pw.word)) continue;
        if (pw.word === selectedWord || pw.word === reversedWord) {
          // Verify cells match the placed word's cells
          const pwCellKeys = new Set(pw.cells.map(([r, c]) => `${r},${c}`));
          const selCellKeys = cells.map(([r, c]) => `${r},${c}`);
          if (selCellKeys.length === pwCellKeys.size && selCellKeys.every((k) => pwCellKeys.has(k))) {
            matchedPlacedWord = pw;
            break;
          }
        }
      }

      if (matchedPlacedWord) {
        const newFound: FoundWord = {
          word: matchedPlacedWord.word,
          player: isSinglePlayer ? 'player1' : currentPlayer,
          cells: matchedPlacedWord.cells,
        };

        setFoundWords((prev) => [...prev, newFound]);

        // In 2P mode, alternate turns
        if (!isSinglePlayer) {
          setCurrentPlayer((prev) =>
            prev === 'player1' ? 'player2' : 'player1'
          );
        }
      }

      // Always clear selection after second tap
      setSelStart(null);
    },
    [puzzle, isGameOver, selStart, foundWordSet, currentPlayer, isSinglePlayer]
  );

  // ── Rematch / Home ────────────────────────────────────────────────────────
  const handleRematch = useCallback(() => {
    setShowGameOver(false);
    const p = generatePuzzle();
    setPuzzle(p);
    setFoundWords([]);
    setCurrentPlayer('player1');
    setSelStart(null);
    setElapsed(0);
    startTimeRef.current = Date.now();
  }, []);

  const handleHome = useCallback(() => {
    setShowGameOver(false);
    router.back();
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // ── Game over result for modal ────────────────────────────────────────────
  const gameOverResult = useMemo(() => {
    if (!puzzle) return { winner: 'draw' as const };

    if (isSinglePlayer) {
      return { winner: 'player1' as const };
    }

    const p1Count = foundWords.filter((fw) => fw.player === 'player1').length;
    const p2Count = foundWords.filter((fw) => fw.player === 'player2').length;

    if (p1Count > p2Count) {
      return {
        winner: 'player1' as const,
        score: { player1: p1Count, player2: p2Count },
      };
    }
    if (p2Count > p1Count) {
      return {
        winner: 'player2' as const,
        score: { player1: p1Count, player2: p2Count },
      };
    }
    return {
      winner: 'draw' as const,
      score: { player1: p1Count, player2: p2Count },
    };
  }, [puzzle, foundWords, isSinglePlayer]);

  const playerNames = isSinglePlayer
    ? { player1: 'You', player2: '' }
    : { player1: 'Player 1', player2: 'Player 2' };

  // ── Grid sizing ───────────────────────────────────────────────────────────
  const gridPadding = 16;
  // Width-bound on phones; on short/landscape screens keep the grid within ~60% of the height.
  const boardWidth = Math.min(
    contentWidth - gridPadding * 2,
    isTablet ? 520 : 400,
    Math.max(260, height * 0.6)
  );
  const cellSize = Math.floor(boardWidth / GRID_SIZE);
  const actualBoardWidth = cellSize * GRID_SIZE;

  // ── Preview line cells (while selecting) ──────────────────────────────────
  const previewCells = useMemo(() => {
    if (!selStart) return new Set<string>();
    return new Set([`${selStart[0]},${selStart[1]}`]);
  }, [selStart]);

  // ── Render ────────────────────────────────────────────────────────────────
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
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ThemedText variant="body" style={{ color: theme.colors.primary }}>
            Back
          </ThemedText>
        </Pressable>
        <ThemedText variant="heading" style={styles.title}>
          Word Search
        </ThemedText>
        <View style={styles.timerContainer}>
          <ThemedText
            variant="label"
            style={{ color: theme.colors.textMuted, fontSize: 14 }}
          >
            {formatTime(elapsed)}
          </ThemedText>
        </View>
      </View>

      {/* Turn Indicator (2P mode) */}
      {!isSinglePlayer && !isGameOver && (
        <TurnIndicator
          currentPlayer={currentPlayer}
          playerNames={playerNames}
        />
      )}

      {/* Score display for 2P */}
      {!isSinglePlayer && (
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: theme.colors.player1 + '20' },
              ]}
            >
              <ThemedText
                variant="label"
                style={{ color: theme.colors.player1, fontSize: 13 }}
              >
                P1: {foundWords.filter((fw) => fw.player === 'player1').length}
              </ThemedText>
            </View>
          </View>
          <View style={styles.scoreItem}>
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: theme.colors.player2 + '20' },
              ]}
            >
              <ThemedText
                variant="label"
                style={{ color: theme.colors.player2, fontSize: 13 }}
              >
                P2: {foundWords.filter((fw) => fw.player === 'player2').length}
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* 1P progress */}
      {isSinglePlayer && puzzle && (
        <View style={styles.progressRow}>
          <ThemedText
            variant="label"
            style={{ color: theme.colors.textMuted, fontSize: 13 }}
          >
            Found {foundWords.length} / {puzzle.words.length}
          </ThemedText>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        bounces={false}
      >
        {/* Selection hint */}
        <View style={styles.hintRow}>
          <ThemedText
            variant="caption"
            style={{ color: theme.colors.textMuted, textAlign: 'center' }}
          >
            {selStart
              ? 'Tap another cell to complete selection'
              : 'Tap a cell to start selecting a word'}
          </ThemedText>
        </View>

        {/* Grid */}
        {puzzle && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[
              styles.board,
              {
                width: actualBoardWidth,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                ...theme.shadows.md,
              },
            ]}
          >
            {puzzle.grid.map((row, r) => (
              <View key={r} style={styles.gridRow}>
                {row.map((letter, c) => {
                  const cellKey = `${r},${c}`;
                  const foundBy = foundCellMap.get(cellKey);
                  const isPreview = previewCells.has(cellKey);

                  let bgColor = 'transparent';
                  let textColor = theme.colors.text;

                  if (foundBy) {
                    bgColor =
                      foundBy === 'player1'
                        ? theme.colors.player1 + '35'
                        : theme.colors.player2 + '35';
                    textColor =
                      foundBy === 'player1'
                        ? theme.colors.player1
                        : theme.colors.player2;
                  } else if (isPreview) {
                    bgColor = theme.colors.primary + '25';
                    textColor = theme.colors.primary;
                  }

                  return (
                    <Pressable
                      key={c}
                      onPress={() => handleCellPress(r, c)}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: bgColor,
                          borderRadius: theme.borderRadius.sm / 2,
                        },
                      ]}
                    >
                      <ThemedText
                        variant="label"
                        style={{
                          color: textColor,
                          fontSize: cellSize * 0.48,
                          fontWeight: foundBy || isPreview ? '800' : '600',
                          textAlign: 'center',
                        }}
                      >
                        {letter}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Word List Panel */}
        {puzzle && (
          <View
            style={[
              styles.wordListPanel,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                ...theme.shadows.sm,
              },
            ]}
          >
            <ThemedText
              variant="label"
              style={[styles.wordListTitle, { color: theme.colors.textMuted }]}
            >
              Words to Find
            </ThemedText>
            <View style={styles.wordListGrid}>
              {puzzle.words.map((pw) => {
                const found = foundWords.find((fw) => fw.word === pw.word);
                const isFound = !!found;

                let wordColor = theme.colors.text;
                if (isFound) {
                  wordColor =
                    found.player === 'player1'
                      ? theme.colors.player1
                      : theme.colors.player2;
                }

                return (
                  <View key={pw.word} style={styles.wordItem}>
                    <ThemedText
                      variant="body"
                      style={{
                        color: wordColor,
                        fontSize: 14,
                        fontWeight: isFound ? '700' : '400',
                        textDecorationLine: isFound ? 'line-through' : 'none',
                        opacity: isFound ? 0.7 : 1,
                      }}
                    >
                      {pw.word}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bottom actions */}
        <View style={styles.bottomButtons}>
          <Button
            title="New Puzzle"
            onPress={handleRematch}
            variant="secondary"
            size="md"
          />
        </View>
      </ScrollView>

      {/* Game Over Modal */}
      <GameOverModal
        visible={showGameOver}
        result={gameOverResult}
        onRematch={handleRematch}
        onHome={handleHome}
        gameName="Word Search"
        playerNames={playerNames}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
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
  timerContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  hintRow: {
    paddingVertical: 6,
  },
  board: {
    padding: 2,
    alignSelf: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordListPanel: {
    marginTop: 16,
    padding: 16,
    width: '100%',
    maxWidth: 400,
  },
  wordListTitle: {
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  wordListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  wordItem: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bottomButtons: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
});
