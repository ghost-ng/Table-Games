import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, makeMove, STORE, TOTAL_SEEDS } from './mancala';

test('sowing conserves seeds, skips the opponent store, and reports an extra turn', () => {
  const state = createGame();
  const before = structuredClone(state);
  const result = makeMove(state, 2)!;
  assert.deepEqual(result.path, [3, 4, 5, 6]);
  assert.equal(result.extraTurn, true);
  assert.equal(result.capture, null);
  assert.equal(result.state.currentPlayer, 'player1');
  assert.equal(result.state.pits[STORE.player1], 1);
  assert.equal(result.state.pits.reduce((sum, count) => sum + count, 0), TOTAL_SEEDS);
  assert.deepEqual(state, before);
  const wrap = createGame();
  wrap.pits[5] = 12;
  wrap.pits[0] = wrap.pits[1] = 0;
  const wrapped = makeMove(wrap, 5)!;
  assert.equal(wrapped.path.includes(STORE.player2), false);
  assert.equal(wrapped.path.length, 12);
  assert.equal(wrapped.state.pits.reduce((sum, count) => sum + count, 0), TOTAL_SEEDS);
});

test('landing in an empty own pit captures the opposite seeds without losing count', () => {
  const state = createGame();
  state.pits[0] = 1;
  state.pits[1] = 0;
  state.pits[STORE.player1] = 7;
  const before = structuredClone(state);
  const result = makeMove(state, 0)!;
  assert.deepEqual(result.path, [1]);
  assert.deepEqual(result.capture, { pit: 1, opposite: 11, seeds: 5 });
  assert.equal(result.extraTurn, false);
  assert.equal(result.state.currentPlayer, 'player2');
  assert.equal(result.state.pits[1], 0);
  assert.equal(result.state.pits[11], 0);
  assert.equal(result.state.pits[STORE.player1], 12);
  assert.equal(result.state.pits.reduce((sum, count) => sum + count, 0), TOTAL_SEEDS);
  assert.deepEqual(state, before);
});
