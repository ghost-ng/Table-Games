import assert from 'node:assert/strict';
import test from 'node:test';
import { checkWinner, createGame, makeMove } from './tic-tac-toe';

test('a completed diagonal returns the three winning cells and ends the round', () => {
  let state = createGame();
  for (const [row, col] of [[0, 0], [0, 1], [1, 1], [1, 0], [2, 2]]) {
    state = makeMove(state, row, col);
  }
  assert.deepEqual(checkWinner(state.board), { winner: 'X', line: [[0, 0], [1, 1], [2, 2]] });
  assert.equal(state.isGameOver, true);
  assert.deepEqual(state.winningLine, [[0, 0], [1, 1], [2, 2]]);
  assert.equal(makeMove(state, 2, 0), state);
});
