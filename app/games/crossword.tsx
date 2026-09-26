import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useResponsive } from '../../src/utils/layout';

const GRID_SIZE = 9;
const GRID_PADDING = 8;

// ─── QWERTY keyboard rows ───────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// ─── Puzzle types ────────────────────────────────────────────────────────────
interface Clue {
  number: number;
  direction: 'across' | 'down';
  clue: string;
  answer: string;
  row: number;
  col: number;
}

interface Puzzle {
  size: number;
  grid: (string | null)[][];
  clues: Clue[];
}

// ─── Embedded puzzles ────────────────────────────────────────────────────────
// Each puzzle is a 9x9 grid. null = black square, string = letter.
// All intersecting letters have been verified to match.

const PUZZLES: Puzzle[] = [
  // ── Puzzle 1: Animals & Nature ─────────────────────────────────────────────
  {
    size: 9,
    grid: [
      [null, null, 'C', null, null, null, 'D', null, null],
      [null, null, 'A', null, null, null, 'O', null, null],
      ['F', 'I', 'S', 'H', null, null, 'G', null, null],
      [null, null, 'E', null, null, null, null, null, null],
      [null, 'B', 'I', 'R', 'D', null, null, null, null],
      [null, null, null, null, 'U', null, null, null, null],
      ['F', 'R', 'O', 'G', 'C', 'K', null, null, null],
      [null, null, null, null, 'K', null, null, null, null],
      [null, null, 'L', 'A', 'M', 'B', null, null, null],
    ],
    clues: [
      { number: 1, direction: 'down', clue: 'Suitcase or bag', answer: 'CASE', row: 0, col: 2 },
      { number: 2, direction: 'down', clue: 'Man\'s best friend', answer: 'DOG', row: 0, col: 6 },
      { number: 3, direction: 'across', clue: 'Swims in water', answer: 'FISH', row: 2, col: 0 },
      { number: 4, direction: 'across', clue: 'It flies in the sky', answer: 'BIRD', row: 4, col: 1 },
      { number: 5, direction: 'down', clue: 'Quack quack bird', answer: 'DUCK', row: 4, col: 4 },
      { number: 6, direction: 'across', clue: 'Ribbit! Green jumper', answer: 'FROG', row: 6, col: 0 },
      { number: 7, direction: 'across', clue: 'Baby sheep', answer: 'LAMB', row: 8, col: 2 },
    ],
  },
  // ── Puzzle 2: Food & Kitchen ───────────────────────────────────────────────
  {
    size: 9,
    grid: [
      [null, null, 'R', null, null, null, null, null, null],
      [null, null, 'I', null, null, null, null, null, null],
      ['C', 'A', 'K', 'E', null, null, null, null, null],
      [null, null, 'E', null, null, 'S', null, null, null],
      [null, 'B', 'R', 'E', 'A', 'D', null, null, null],
      [null, null, null, null, null, 'O', null, null, null],
      [null, null, null, 'M', 'I', 'L', 'K', null, null],
      [null, null, null, null, null, 'A', null, null, null],
      [null, 'P', 'L', 'U', 'M', null, null, null, null],
    ],
    clues: [
      { number: 1, direction: 'down', clue: 'Cooked grain dish', answer: 'RICE', row: 0, col: 2 },
      { number: 2, direction: 'across', clue: 'Birthday treat', answer: 'CAKE', row: 2, col: 0 },
      { number: 3, direction: 'across', clue: 'Sliced for sandwiches', answer: 'BREAD', row: 4, col: 1 },
      { number: 4, direction: 'down', clue: 'Fizzy lemon drink', answer: 'SODA', row: 3, col: 5 },
      { number: 5, direction: 'across', clue: 'White dairy drink', answer: 'MILK', row: 6, col: 3 },
      { number: 6, direction: 'across', clue: 'Purple fruit', answer: 'PLUM', row: 8, col: 1 },
    ],
  },
  // ── Puzzle 3: Sports & Games ───────────────────────────────────────────────
  {
    size: 9,
    grid: [
      [null, null, null, null, 'G', null, null, null, null],
      [null, null, null, null, 'O', null, null, null, null],
      [null, null, null, null, 'A', null, null, null, null],
      ['R', 'U', 'N', null, 'L', null, null, null, null],
      [null, null, null, null, null, null, null, null, null],
      [null, null, 'K', 'I', 'C', 'K', null, null, null],
      [null, null, null, null, null, null, null, null, null],
      [null, 'T', 'E', 'A', 'M', null, null, null, null],
      [null, null, null, null, null, null, null, null, null],
    ],
    clues: [
      { number: 1, direction: 'down', clue: 'Score target in soccer', answer: 'GOAL', row: 0, col: 4 },
      { number: 2, direction: 'across', clue: 'Sprint or jog', answer: 'RUN', row: 3, col: 0 },
      { number: 3, direction: 'across', clue: 'Boot the ball', answer: 'KICK', row: 5, col: 2 },
      { number: 4, direction: 'across', clue: 'Group of players', answer: 'TEAM', row: 7, col: 1 },
    ],
  },
  // ── Puzzle 4: Around the House ─────────────────────────────────────────────
  {
    size: 9,
    grid: [
      [null, 'L', null, null, null, null, null, null, null],
      [null, 'A', null, null, null, null, null, null, null],
      [null, 'M', null, null, null, null, null, null, null],
      ['D', 'O', 'O', 'R', null, null, null, null, null],
      [null, null, null, 'U', null, null, null, null, null],
      [null, null, null, 'G', null, null, null, null, null],
      ['W', 'A', 'L', 'L', null, null, null, null, null],
      [null, null, null, null, null, 'B', 'E', 'D', null],
      [null, 'R', 'O', 'O', 'F', null, null, null, null],
    ],
    clues: [
      { number: 1, direction: 'down', clue: 'Provides light on a desk', answer: 'LAMP', row: 0, col: 1 },
      { number: 2, direction: 'across', clue: 'Entrance to a room', answer: 'DOOR', row: 3, col: 0 },
      { number: 3, direction: 'down', clue: 'Floor covering (carpet)', answer: 'RUG', row: 3, col: 3 },
      { number: 4, direction: 'across', clue: 'Vertical room divider', answer: 'WALL', row: 6, col: 0 },
      { number: 5, direction: 'across', clue: 'Sleep on this', answer: 'BED', row: 7, col: 5 },
      { number: 6, direction: 'across', clue: 'Top of a house', answer: 'ROOF', row: 8, col: 1 },
    ],
  },
  // ── Puzzle 5: Weather & Sky ────────────────────────────────────────────────
  {
    size: 9,
    grid: [
      [null, null, 'S', 'U', 'N', null, null, null, null],
      [null, null, null, null, null, null, null, null, null],
      ['R', 'A', 'I', 'N', null, null, null, null, null],
      [null, null, null, null, null, null, null, null, null],
      [null, 'W', 'I', 'N', 'D', null, null, null, null],
      [null, null, null, null, null, null, null, null, null],
      [null, null, 'F', 'O', 'G', null, null, null, null],
      [null, null, null, null, null, null, null, null, null],
      ['H', 'A', 'I', 'L', null, null, null, null, null],
    ],
    clues: [
      { number: 1, direction: 'across', clue: 'Bright star in our sky', answer: 'SUN', row: 0, col: 2 },
      { number: 2, direction: 'across', clue: 'Water from clouds', answer: 'RAIN', row: 2, col: 0 },
      { number: 3, direction: 'across', clue: 'Moving air', answer: 'WIND', row: 4, col: 1 },
      { number: 4, direction: 'across', clue: 'Thick mist', answer: 'FOG', row: 6, col: 2 },
      { number: 5, direction: 'across', clue: 'Icy precipitation', answer: 'HAIL', row: 8, col: 0 },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a lookup: grid[row][col] -> clue number to display */
function buildNumberMap(puzzle: Puzzle): Map<string, number> {
  const map = new Map<string, number>();
  for (const clue of puzzle.clues) {
    const key = `${clue.row},${clue.col}`;
    if (!map.has(key)) {
      map.set(key, clue.number);
    }
  }
  return map;
}

/** Get all cells belonging to a clue */
function getClueCells(clue: Clue): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < clue.answer.length; i++) {
    if (clue.direction === 'across') {
      cells.push({ row: clue.row, col: clue.col + i });
    } else {
      cells.push({ row: clue.row + i, col: clue.col });
    }
  }
  return cells;
}

/** Find the clue that a given cell + direction belongs to */
function findClueForCell(
  puzzle: Puzzle,
  row: number,
  col: number,
  direction: 'across' | 'down',
): Clue | null {
  for (const clue of puzzle.clues) {
    if (clue.direction !== direction) continue;
    const cells = getClueCells(clue);
    if (cells.some((c) => c.row === row && c.col === col)) {
      return clue;
    }
  }
  return null;
}

/** Get the next empty cell in a clue after the given cell, or null */
function getNextCellInClue(
  clue: Clue,
  row: number,
  col: number,
  userGrid: (string | null)[][],
): { row: number; col: number } | null {
  const cells = getClueCells(clue);
  const idx = cells.findIndex((c) => c.row === row && c.col === col);
  // Move to next cell in the clue
  for (let i = idx + 1; i < cells.length; i++) {
    if (!userGrid[cells[i].row][cells[i].col]) {
      return cells[i];
    }
  }
  // If all filled after, try to find any empty cell in clue
  for (let i = 0; i < cells.length; i++) {
    if (!userGrid[cells[i].row][cells[i].col]) {
      return cells[i];
    }
  }
  return null;
}

/** Count total fillable cells */
function countFillableCells(puzzle: Puzzle): number {
  let count = 0;
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.grid[r][c] !== null) count++;
    }
  }
  return count;
}

/** Count correctly filled cells */
function countCorrectCells(puzzle: Puzzle, userGrid: (string | null)[][]): number {
  let count = 0;
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.grid[r][c] !== null && userGrid[r][c] === puzzle.grid[r][c]) {
        count++;
      }
    }
  }
  return count;
}

/** Check if a clue is fully and correctly filled */
function isClueComplete(clue: Clue, userGrid: (string | null)[][]): boolean {
  const cells = getClueCells(clue);
  return cells.every((c) => userGrid[c.row][c.col] === clue.answer[cells.indexOf(c)]);
}

/** Format seconds into mm:ss */
function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
type Phase = 'modeSelect' | 'playing';

export default function CrosswordScreen() {
  const { contentWidth, height, isTablet, isLandscape } = useResponsive();
  // Keep the board above the fixed keyboard on compact phones.
  const gridWidth = Math.min(contentWidth - 40, isTablet ? 540 : 400, height <= 640 && !isLandscape ? 200 : Math.max(200, height * 0.44));
  const keyWidth = Math.min(44, ((isLandscape && height < 560 ? (contentWidth - 24) * 0.58 : contentWidth - 24) - 45) / 10);
  const cellSize = Math.floor((gridWidth - GRID_PADDING * 2) / GRID_SIZE);
  const { theme } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const shortLandscape = isLandscape && height < 560;

  // Mode & phase
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const resolvedMode = (modeParam === 'multiplayer' ? 'multiplayer' : 'single') as 'single' | 'multiplayer';

  const [mode, setMode] = useState<'single' | 'multiplayer'>(resolvedMode);
  const [phase, setPhase] = useState<Phase>('playing');

  // Puzzle
  const [puzzleIndex, setPuzzleIndex] = useState(() => Math.floor(Math.random() * PUZZLES.length));
  const puzzle = PUZZLES[puzzleIndex];
  const numberMap = useMemo(() => buildNumberMap(puzzle), [puzzleIndex]);

  // User-entered grid (null = empty, string = letter entered)
  const [userGrid, setUserGrid] = useState<(string | null)[][]>(
    () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
  );

  // Selection state
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Game over
  const [gameOver, setGameOver] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resultRecorded, setResultRecorded] = useState(false);

  // 2P state
  const [currentPlayer, setCurrentPlayer] = useState<'player1' | 'player2'>('player1');
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [turnWordFilled, setTurnWordFilled] = useState(false);

  const isSinglePlayer = mode === 'single';

  // Active clue
  const activeClue = useMemo(() => {
    if (selectedRow === null || selectedCol === null) return null;
    return findClueForCell(puzzle, selectedRow, selectedCol, direction);
  }, [selectedRow, selectedCol, direction, puzzleIndex]);

  // Highlighted cells
  const highlightedCells = useMemo(() => {
    if (!activeClue) return new Set<string>();
    const cells = getClueCells(activeClue);
    return new Set(cells.map((c) => `${c.row},${c.col}`));
  }, [activeClue]);

  // Completion percentage
  const totalCells = useMemo(() => countFillableCells(puzzle), [puzzleIndex]);
  const correctCells = useMemo(() => countCorrectCells(puzzle, userGrid), [userGrid, puzzleIndex]);
  const completionPct = totalCells > 0 ? Math.round((correctCells / totalCells) * 100) : 0;

  // ── Timer logic ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing' && !gameOver) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, gameOver]);

  // ── Check completion ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || gameOver) return;
    if (correctCells === totalCells && totalCells > 0) {
      setGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [correctCells, totalCells, phase, gameOver]);

  // ── Record result on game over ───────────────────────────────────────────
  useEffect(() => {
    if (gameOver && !resultRecorded) {
      setResultRecorded(true);

      const durationSeconds = elapsed;

      if (isSinglePlayer) {
        recordGameResult({
          game: 'crossword',
          mode: 'single',
          player: 'Player',
          score: completionPct,
          result: 'win',
          durationSeconds,
        });
      } else {
        const winner =
          scores.player1 > scores.player2
            ? 'Player 1'
            : scores.player2 > scores.player1
            ? 'Player 2'
            : 'Draw';
        if (winner !== 'Draw') {
          recordGameResult({
            game: 'crossword',
            mode: 'multiplayer',
            player: winner,
            score: Math.max(scores.player1, scores.player2),
            result: 'win',
            durationSeconds,
          });
        } else {
          recordGameResult({
            game: 'crossword',
            mode: 'multiplayer',
            player: 'Player 1',
            score: scores.player1,
            result: 'draw',
            durationSeconds,
          });
        }
      }

      const timeout = setTimeout(() => setShowModal(true), 600);
      return () => clearTimeout(timeout);
    }
  }, [gameOver]);

  // ── Mode selection ────────────────────────────────────────────────────────
  const startGame = useCallback((selectedMode: 'single' | 'multiplayer') => {
    setMode(selectedMode);
    const idx = Math.floor(Math.random() * PUZZLES.length);
    setPuzzleIndex(idx);
    setUserGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)));
    setSelectedRow(null);
    setSelectedCol(null);
    setDirection('across');
    setElapsed(0);
    setGameOver(false);
    setShowModal(false);
    setResultRecorded(false);
    setCurrentPlayer('player1');
    setScores({ player1: 0, player2: 0 });
    setTurnWordFilled(false);
    startTimeRef.current = Date.now();
    setPhase('playing');
  }, []);

  // ── Cell tap ──────────────────────────────────────────────────────────────
  const handleCellTap = useCallback(
    (row: number, col: number) => {
      if (gameOver) return;
      if (puzzle.grid[row][col] === null) return; // black square

      if (selectedRow === row && selectedCol === col) {
        // Tapping same cell toggles direction
        setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      } else {
        setSelectedRow(row);
        setSelectedCol(col);
      }
    },
    [selectedRow, selectedCol, gameOver, puzzle],
  );

  // ── Toggle direction ──────────────────────────────────────────────────────
  const handleToggleDirection = useCallback(() => {
    setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
  }, []);

  // ── Key press ─────────────────────────────────────────────────────────────
  const handleKeyPress = useCallback(
    (letter: string) => {
      if (gameOver) return;
      if (selectedRow === null || selectedCol === null) return;
      if (puzzle.grid[selectedRow][selectedCol] === null) return;

      setUserGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[selectedRow][selectedCol] = letter;
        return next;
      });

      // In 2P mode, check if current word is now complete after placing letter
      if (!isSinglePlayer && activeClue) {
        // Build a temporary grid with this letter placed to check completion
        const tempGrid = userGrid.map((r) => [...r]);
        tempGrid[selectedRow][selectedCol] = letter;
        if (isClueComplete(activeClue, tempGrid)) {
          // Award point and switch turns
          setScores((prev) => ({
            ...prev,
            [currentPlayer]: prev[currentPlayer] + 1,
          }));
          setTurnWordFilled(true);
          // Switch player after a brief moment
          setTimeout(() => {
            setCurrentPlayer((prev) => (prev === 'player1' ? 'player2' : 'player1'));
            setTurnWordFilled(false);
          }, 500);
        }
      }

      // Auto-advance to next empty cell in the clue
      if (activeClue) {
        const tempGrid = userGrid.map((r) => [...r]);
        tempGrid[selectedRow][selectedCol] = letter;
        const nextCell = getNextCellInClue(activeClue, selectedRow, selectedCol, tempGrid);
        if (nextCell) {
          setSelectedRow(nextCell.row);
          setSelectedCol(nextCell.col);
        }
      }
    },
    [selectedRow, selectedCol, gameOver, puzzle, activeClue, userGrid, isSinglePlayer, currentPlayer],
  );

  // ── Backspace ─────────────────────────────────────────────────────────────
  const handleBackspace = useCallback(() => {
    if (gameOver) return;
    if (selectedRow === null || selectedCol === null) return;

    if (userGrid[selectedRow][selectedCol]) {
      // Clear current cell
      setUserGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[selectedRow][selectedCol] = null;
        return next;
      });
    } else if (activeClue) {
      // Move back to previous cell in clue
      const cells = getClueCells(activeClue);
      const idx = cells.findIndex((c) => c.row === selectedRow && c.col === selectedCol);
      if (idx > 0) {
        const prev = cells[idx - 1];
        setSelectedRow(prev.row);
        setSelectedCol(prev.col);
        setUserGrid((prevGrid) => {
          const next = prevGrid.map((r) => [...r]);
          next[prev.row][prev.col] = null;
          return next;
        });
      }
    }
  }, [selectedRow, selectedCol, gameOver, userGrid, activeClue]);

  // ── Rematch / Home ────────────────────────────────────────────────────────
  const handleRematch = useCallback(() => {
    startGame(mode ?? 'single');
  }, [mode, startGame]);

  const handleHome = useCallback(() => {
    setShowModal(false);
    router.back();
  }, [router]);

  // ── Modal result ──────────────────────────────────────────────────────────
  const getModalResult = () => {
    if (isSinglePlayer) {
      return { winner: 'player1' as const };
    }
    if (scores.player1 > scores.player2) {
      return {
        winner: 'player1' as const,
        score: { player1: scores.player1, player2: scores.player2 },
      };
    }
    if (scores.player2 > scores.player1) {
      return {
        winner: 'player2' as const,
        score: { player1: scores.player1, player2: scores.player2 },
      };
    }
    return {
      winner: 'draw' as const,
      score: { player1: scores.player1, player2: scores.player2 },
    };
  };

  const keyboard = (
          <View style={styles.keyboard}>
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.keyboardRow}>
                {row.map((letter) => (
                  <GamePressable
                    key={letter}
                    onPress={() => handleKeyPress(letter)}
                    accessibilityLabel={`Enter ${letter}`}
                    accessibilityState={{ disabled: gameOver }}
                    disabled={gameOver}
                    style={[
                      styles.key,
                      {
                        width: keyWidth,
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        borderRadius: theme.borderRadius.sm,
                        opacity: gameOver ? 0.4 : 1,
                        ...theme.shadows.sm,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="label"
                      style={{
                        color: theme.colors.text,
                        fontWeight: '700',
                        fontSize: 16,
                      }}
                    >
                      {letter}
                    </ThemedText>
                  </GamePressable>
                ))}
              </View>
            ))}
            {/* Backspace row */}
            <View style={styles.keyboardRow}>
              <GamePressable
                onPress={handleBackspace}
                accessibilityLabel="Delete letter"
                disabled={gameOver}
                style={[
                  styles.key,
                  {
                    width: 80,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.borderRadius.sm,
                    opacity: gameOver ? 0.4 : 1,
                    ...theme.shadows.sm,
                  },
                ]}
              >
                <ThemedText
                  variant="label"
                  style={{ color: theme.colors.error, fontWeight: '700', fontSize: 14 }}
                >
                  DEL
                </ThemedText>
              </GamePressable>
            </View>
          </View>

  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <GameShell title="Crossword" onBack={() => router.back()}
      status={<ThemedText variant="caption" style={{ textAlign: 'center' }}>
        {formatTime(elapsed)} · Complete {completionPct}%{!isSinglePlayer ? ` · ${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}'s Turn · P1: ${scores.player1} · P2: ${scores.player2}` : ''}
      </ThemedText>}
      footer={!shortLandscape && phase === 'playing' ? keyboard : undefined}>
      <View style={{ flex: 1, minHeight: 0, flexDirection: shortLandscape ? 'row' : 'column', gap: shortLandscape ? 16 : 0 }}>

      {/* ── Playing ───────────────────────────────────────────────────── */}
      {phase === 'playing' && (
        <ScrollView
          style={{ flex: 1, minWidth: 0 }}
          contentContainerStyle={[
            styles.playContent,
            { paddingBottom: 16 },
          ]}
          bounces={false}
        >
          {!shortLandscape ? <>
          {/* Active clue display */}
          <View
            style={[
              styles.clueBar,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                ...theme.shadows.sm,
              },
            ]}
          >
            <ThemedText variant="label" style={{ color: theme.colors.primary, marginRight: 6 }}>
              {activeClue
                ? `${activeClue.number} ${activeClue.direction.toUpperCase()}`
                : '--'}
            </ThemedText>
            <ThemedText
              variant="body"
              style={{ color: theme.colors.text, flex: 1 }}
              numberOfLines={2}
            >
              {activeClue ? activeClue.clue : 'Tap a cell to begin'}
            </ThemedText>
          </View>

          {/* Direction toggle */}
          <View style={styles.directionToggle}>
            <GamePressable
              onPress={handleToggleDirection}
              accessibilityLabel="Across"
              accessibilityState={{ selected: direction === 'across' }}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    direction === 'across' ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.borderRadius.sm,
                },
              ]}
            >
              <ThemedText
                variant="label"
                style={{
                  color: direction === 'across' ? theme.colors.onPrimary : theme.colors.text,
                  fontSize: 13,
                }}
              >
                Across
              </ThemedText>
            </GamePressable>
            <GamePressable
              onPress={handleToggleDirection}
              accessibilityLabel="Down"
              accessibilityState={{ selected: direction === 'down' }}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    direction === 'down' ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.borderRadius.sm,
                },
              ]}
            >
              <ThemedText
                variant="label"
                style={{
                  color: direction === 'down' ? theme.colors.onPrimary : theme.colors.text,
                  fontSize: 13,
                }}
              >
                Down
              </ThemedText>
            </GamePressable>
          </View>

          </> : null}
          {/* Crossword grid */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300)}
            style={[
              styles.gridContainer,
              {
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.border,
              },
            ]}
          >
            {Array.from({ length: GRID_SIZE }).map((_, row) => (
              <View key={row} style={styles.gridRow}>
                {Array.from({ length: GRID_SIZE }).map((_, col) => {
                  const isBlack = puzzle.grid[row][col] === null;
                  const isSelected = selectedRow === row && selectedCol === col;
                  const isHighlighted = highlightedCells.has(`${row},${col}`);
                  const clueNumber = numberMap.get(`${row},${col}`);
                  const userLetter = userGrid[row][col];
                  const correctLetter = puzzle.grid[row][col];
                  const isCorrect = userLetter !== null && userLetter === correctLetter;
                  const isWrong = userLetter !== null && userLetter !== correctLetter;

                  return (
                    <GamePressable
                      key={col}
                      onPress={() => handleCellTap(row, col)}
                      disabled={isBlack || gameOver}
                      accessibilityLabel={`Row ${row + 1}, column ${col + 1}: ${isBlack ? "blocked" : userLetter ?? "empty"}${isSelected ? `, selected ${direction}` : ""}`}
                      accessibilityState={{ selected: isSelected, disabled: isBlack || gameOver }}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: isBlack
                            ? theme.colors.text
                            : isSelected
                            ? theme.colors.primary + '50'
                            : isHighlighted
                            ? theme.colors.primary + '20'
                            : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          borderWidth: isSelected ? 2 : 0.5,
                          borderBottomWidth: isHighlighted ? 2 : 0.5,
                        },
                      ]}
                    >
                      {clueNumber !== undefined && !isBlack && (
                        <ThemedText
                          variant="caption"
                          style={[
                            styles.clueNumber,
                            { color: theme.colors.textMuted, fontSize: Math.max(8, cellSize * 0.25) },
                          ]}
                        >
                          {clueNumber}
                        </ThemedText>
                      )}
                      {!isBlack && userLetter && (
                        <ThemedText
                          variant="label"
                          style={{
                            color: gameOver
                              ? isCorrect
                                ? theme.colors.success
                                : theme.colors.error
                              : theme.colors.text,
                            fontSize: cellSize * 0.5,
                            fontWeight: '700',
                            textAlign: 'center',
                          }}
                        >
                          {userLetter}
                        </ThemedText>
                      )}
                    </GamePressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>

          {shortLandscape ? <>
          {/* Active clue display */}
          <View
            style={[
              styles.clueBar,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                ...theme.shadows.sm,
              },
            ]}
          >
            <ThemedText variant="label" style={{ color: theme.colors.primary, marginRight: 6 }}>
              {activeClue
                ? `${activeClue.number} ${activeClue.direction.toUpperCase()}`
                : '--'}
            </ThemedText>
            <ThemedText
              variant="body"
              style={{ color: theme.colors.text, flex: 1 }}
              numberOfLines={2}
            >
              {activeClue ? activeClue.clue : 'Tap a cell to begin'}
            </ThemedText>
          </View>

          {/* Direction toggle */}
          <View style={styles.directionToggle}>
            <GamePressable
              onPress={handleToggleDirection}
              accessibilityLabel="Across"
              accessibilityState={{ selected: direction === 'across' }}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    direction === 'across' ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.borderRadius.sm,
                },
              ]}
            >
              <ThemedText
                variant="label"
                style={{
                  color: direction === 'across' ? theme.colors.onPrimary : theme.colors.text,
                  fontSize: 13,
                }}
              >
                Across
              </ThemedText>
            </GamePressable>
            <GamePressable
              onPress={handleToggleDirection}
              accessibilityLabel="Down"
              accessibilityState={{ selected: direction === 'down' }}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    direction === 'down' ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.borderRadius.sm,
                },
              ]}
            >
              <ThemedText
                variant="label"
                style={{
                  color: direction === 'down' ? theme.colors.onPrimary : theme.colors.text,
                  fontSize: 13,
                }}
              >
                Down
              </ThemedText>
            </GamePressable>
          </View>

          </> : null}
          {/* Clue list */}
          <View style={styles.clueSection}>
            <ThemedText variant="label" style={{ color: theme.colors.primary, marginBottom: 4 }}>
              ACROSS
            </ThemedText>
            {puzzle.clues
              .filter((c) => c.direction === 'across')
              .map((c) => {
                const done = isClueComplete(c, userGrid);
                return (
                  <GamePressable
                    key={`a-${c.number}`}
                    onPress={() => {
                      setDirection('across');
                      setSelectedRow(c.row);
                      setSelectedCol(c.col);
                    }}
                    accessibilityLabel={`Clue ${c.number} ${c.direction}: ${c.clue}${done ? ', complete' : ''}`}
                    accessibilityState={{ selected: activeClue === c }}
                    style={[styles.clueRow, { borderLeftWidth: activeClue === c ? 3 : 0, borderLeftColor: theme.colors.primary, backgroundColor: activeClue === c ? theme.colors.surfaceSunken : 'transparent' }]}
                  >
                    <ThemedText
                      variant="body"
                      style={{
                        color: done ? theme.colors.success : theme.colors.text,
                        textDecorationLine: done ? 'line-through' : 'none',
                        fontSize: 13,
                      }}
                    >
                      {c.number}. {c.clue}
                    </ThemedText>
                  </GamePressable>
                );
              })}

            <ThemedText
              variant="label"
              style={{ color: theme.colors.primary, marginBottom: 4, marginTop: 10 }}
            >
              DOWN
            </ThemedText>
            {puzzle.clues
              .filter((c) => c.direction === 'down')
              .map((c) => {
                const done = isClueComplete(c, userGrid);
                return (
                  <GamePressable
                    key={`d-${c.number}`}
                    onPress={() => {
                      setDirection('down');
                      setSelectedRow(c.row);
                      setSelectedCol(c.col);
                    }}
                    accessibilityLabel={`Clue ${c.number} ${c.direction}: ${c.clue}${done ? ', complete' : ''}`}
                    accessibilityState={{ selected: activeClue === c }}
                    style={[styles.clueRow, { borderLeftWidth: activeClue === c ? 3 : 0, borderLeftColor: theme.colors.primary, backgroundColor: activeClue === c ? theme.colors.surfaceSunken : 'transparent' }]}
                  >
                    <ThemedText
                      variant="body"
                      style={{
                        color: done ? theme.colors.success : theme.colors.text,
                        textDecorationLine: done ? 'line-through' : 'none',
                        fontSize: 13,
                      }}
                    >
                      {c.number}. {c.clue}
                    </ThemedText>
                  </GamePressable>
                );
              })}
          </View>

        </ScrollView>
      )}

      {shortLandscape && phase === 'playing' ? <View style={{ width: '58%', justifyContent: 'center' }}>{keyboard}</View> : null}
      </View>

      {/* ── Game Over Modal ───────────────────────────────────────────── */}
      <GameOverModal
        visible={showModal}
        result={getModalResult()}
        onRematch={handleRematch}
        onHome={handleHome}
        gameName="Crossword"
      />
    </GameShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  playContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  clueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    width: '100%',
    minHeight: 44,
  },
  directionToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  gridContainer: {
    borderWidth: 2,
    padding: 1,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clueNumber: {
    position: 'absolute',
    top: 1,
    left: 2,
    lineHeight: 10,
  },
  clueSection: {
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  clueRow: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  keyboard: {
    marginTop: 0,
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
    height: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
