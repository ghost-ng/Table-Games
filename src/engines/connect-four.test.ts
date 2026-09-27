import assert from 'node:assert/strict';
import test from 'node:test';
import { checkWinner, createGame, dropPiece } from './connect-four';

test('four horizontal drops return all four winning cells and stop further moves', () => {
  let state = createGame();
  for (const column of [0, 6, 1, 6, 2, 5, 3]) state = dropPiece(state, column);
  assert.deepEqual(checkWinner(state.board), { winner: 'red', line: [[5, 0], [5, 1], [5, 2], [5, 3]] });
  assert.deepEqual(state.lastMove, [5, 3]);
  assert.equal(state.isGameOver, true);
  assert.equal(dropPiece(state, 4), state);
});
