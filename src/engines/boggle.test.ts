import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdjacentCells, traceWord, type Board } from './boggle';

test('adjacency includes diagonals but excludes the cube itself and out-of-board cells', () => {
  assert.deepEqual(getAdjacentCells(0, 0), [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }]);
  assert.deepEqual(getAdjacentCells(1, 1), [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 2 },
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
  ]);
});

test('tracing keeps ordered adjacent cubes, expands QU, and rejects cube reuse', () => {
  const board: Board = [['QU', 'I', 'T', 'X'], ['C', 'A', 'X', 'X'], ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X']];
  assert.deepEqual(traceWord(board, 'QUIT'), [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]);
  assert.deepEqual(traceWord(board, 'CAT'), [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 2 }]);
  assert.equal(traceWord(board, 'CAC'), null);
  assert.equal(traceWord(board, 'QIT'), null);
  assert.deepEqual(board[0], ['QU', 'I', 'T', 'X']);
});
