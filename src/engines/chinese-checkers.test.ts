import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, getLegalDestinations, holeAt, HOLES } from './chinese-checkers';

test('adjacent steps and chained jumps leave the marble board unchanged', () => {
  const state = createGame();
  state.board = HOLES.map(() => null);
  const from = holeAt(0, 0, 0);
  const adjacent = holeAt(0, 1, -1);
  const hop = holeAt(2, -2, 0);
  const chained = holeAt(4, -4, 0);
  state.board[from] = 'player1';
  state.board[holeAt(1, -1, 0)] = 'player2';
  state.board[holeAt(3, -3, 0)] = 'player1';
  const before = structuredClone(state);
  const moves = getLegalDestinations(state, from);
  assert.deepEqual(moves.find((move) => move.to === adjacent), { from, to: adjacent, path: [from, adjacent], isHop: false });
  assert.deepEqual(moves.find((move) => move.to === hop), { from, to: hop, path: [from, hop], isHop: true });
  assert.deepEqual(moves.find((move) => move.to === chained), { from, to: chained, path: [from, hop, chained], isHop: true });
  assert.equal(moves.some((move) => move.to === from || state.board[move.to] !== null), false);
  assert.deepEqual(state, before);
});
