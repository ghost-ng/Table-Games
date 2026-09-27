import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, drawLine } from './dots-and-boxes';

test('closing a box assigns its owner, scores once, and retains the turn', () => {
  let state = createGame(3);
  state = drawLine(state, 'horizontal', 0, 0);
  state = drawLine(state, 'vertical', 0, 0);
  state = drawLine(state, 'horizontal', 1, 0);
  assert.equal(state.currentPlayer, 'player2');
  const next = drawLine(state, 'vertical', 0, 1);
  assert.equal(next.boxes[0][0], 'player2');
  assert.deepEqual(next.scores, { player1: 0, player2: 1 });
  assert.equal(next.currentPlayer, 'player2');
  assert.equal(next.isGameOver, false);
  assert.deepEqual(next.lastMove, { orientation: 'vertical', row: 0, col: 1 });
  assert.equal(drawLine(next, 'vertical', 0, 1), next);
  assert.equal(state.boxes[0][0], null);
});
