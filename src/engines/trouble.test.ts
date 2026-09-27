import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMove, createGame, getLegalMoves, HOME, rollDie, trackPosition } from './trouble';

test('four-seat legal moves and captures preserve seat ownership and input state', () => {
  const state = createGame(4);
  state.current = 1;
  state.players[1].pegs[0] = 0;
  state.players[2].pegs[0] = 24; // Seat 3 absolute space 10: seat 2 start 7 + roll 3.
  const before = structuredClone(state);
  const moves = getLegalMoves(state, 3);
  assert.deepEqual(moves, [{ player: 1, peg: 0, from: 0, to: 3, capture: { player: 2, peg: 0 } }]);
  const next = applyMove(state, moves[0], 3);
  assert.deepEqual(next.players.map((player) => player.seat), [0, 1, 2, 3]);
  assert.equal(next.players[1].pegs[0], 3);
  assert.equal(trackPosition(next.players[1].seat, next.players[1].pegs[0]), 10);
  assert.equal(next.players[2].pegs[0], HOME);
  assert.deepEqual(next.players[0], state.players[0]);
  assert.deepEqual(next.players[3], state.players[3]);
  assert.equal(next.current, 2);
  assert.deepEqual(state, before);
});

test('home exits need six and every injected die boundary stays within 1–6', () => {
  const state = createGame(2);
  assert.deepEqual(state.players.map((player) => player.seat), [0, 2]);
  assert.deepEqual(getLegalMoves(state, 5), []);
  const moves = getLegalMoves(state, 6);
  assert.deepEqual(moves, [{ player: 0, peg: 0, from: HOME, to: 0, capture: null }]);
  assert.equal(applyMove(state, moves[0], 6).current, 0);
  for (let value = 1; value <= 6; value++) assert.equal(rollDie(() => (value - 1) / 6), value);
  assert.equal(rollDie(() => 0.999999), 6);
  assert.equal(rollDie(() => -1), 1);
  assert.equal(rollDie(() => 1), 6);
});
