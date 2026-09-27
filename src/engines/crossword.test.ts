import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, getClueForCell, selectCell } from './crossword';
import type { CrosswordPuzzle } from '../data/crossword-puzzles';

const puzzle: CrosswordPuzzle = { id: 1, size: 3,
  grid: [['C', 'A', 'T'], ['O', null, null], ['W', null, null]],
  clues: [
    { number: 1, clue: 'Feline', answer: 'CAT', startRow: 0, startCol: 0, direction: 'across' },
    { number: 1, clue: 'Farm animal', answer: 'COW', startRow: 0, startCol: 0, direction: 'down' },
  ],
};

test('crossing cell lookup follows the requested active direction', () => {
  assert.equal(getClueForCell(puzzle, 0, 0, 'across')?.answer, 'CAT');
  assert.equal(getClueForCell(puzzle, 0, 0, 'down')?.answer, 'COW');
  assert.equal(getClueForCell(puzzle, 0, 2, 'down'), null);
});

test('selection preserves direction, toggles a crossing, and falls back for a single-direction cell', () => {
  const initial = createGame(puzzle);
  const across = selectCell(initial, 0, 0);
  assert.equal(across.selectedDirection, 'across');
  assert.equal(across.selectedClue?.answer, 'CAT');
  const down = selectCell(across, 0, 0);
  assert.equal(down.selectedDirection, 'down');
  assert.equal(down.selectedClue?.answer, 'COW');
  assert.equal(selectCell(down, 1, 0).selectedDirection, 'down');
  const fallback = selectCell(down, 0, 2);
  assert.equal(fallback.selectedDirection, 'across');
  assert.equal(fallback.selectedClue?.answer, 'CAT');
  assert.deepEqual(fallback.selectedCell, { row: 0, col: 2 });
  assert.equal(selectCell(fallback, 1, 1), fallback);
  assert.equal(initial.selectedCell, null);
});
