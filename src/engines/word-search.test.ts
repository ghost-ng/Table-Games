import assert from 'node:assert/strict';
import test from 'node:test';
import { checkSelection, createGame, getWordCells, type WordEntry } from './word-search';

test('word cells follow the canonical ordered path in all four directions', () => {
  const cases = [
    ['horizontal', [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }]],
    ['vertical', [{ row: 2, col: 0 }, { row: 3, col: 0 }, { row: 4, col: 0 }]],
    ['diagonal-down', [{ row: 2, col: 0 }, { row: 3, col: 1 }, { row: 4, col: 2 }]],
    ['diagonal-up', [{ row: 2, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 2 }]],
  ] as const;
  for (const [direction, expected] of cases) {
    const entry: WordEntry = { word: 'CAT', startRow: 2, startCol: 0, direction, found: false };
    assert.deepEqual(getWordCells(entry), expected);
  }
});

test('a reversed selection finds the canonical path without mutating the original game', () => {
  const state = createGame({ id: 1, category: 'Fixture', gridSize: 3,
    grid: [['X', 'X', 'T'], ['X', 'A', 'X'], ['C', 'X', 'X']],
    words: [{ word: 'CAT', startRow: 2, startCol: 0, direction: 'diagonal-up' }],
  });
  const result = checkSelection(state, 0, 2, 2, 0);
  assert.equal(result.word, 'CAT');
  assert.deepEqual(getWordCells(result.state.words[0]), [{ row: 2, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 2 }]);
  assert.equal(result.state.words[0].found, true);
  assert.deepEqual(result.state.scores, { player1: 3, player2: 0 });
  assert.equal(result.state.currentPlayer, 'player2');
  assert.equal(result.state.isGameOver, true);
  assert.equal(state.words[0].found, false);
  assert.equal(state.foundWords.size, 0);
});
