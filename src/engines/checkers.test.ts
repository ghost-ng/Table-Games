import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, getValidMoves, makeMove, type Board } from './checkers';

test('a mandatory jump suppresses simple moves for every other piece', () => {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[5][2] = { player: 'player1', type: 'normal' };
  board[5][6] = { player: 'player1', type: 'normal' };
  board[4][3] = { player: 'player2', type: 'normal' };
  assert.deepEqual(getValidMoves(board, { row: 5, col: 2 }, 'player1'), [{ from: { row: 5, col: 2 }, to: { row: 3, col: 4 }, captured: { row: 4, col: 3 } }]);
  assert.deepEqual(getValidMoves(board, { row: 5, col: 6 }, 'player1'), []);
});

test('a normal piece reaching the far row becomes a king without mutating the old board', () => {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[1][2] = { player: 'player1', type: 'normal' };
  board[5][6] = { player: 'player2', type: 'normal' };
  const state = { ...createGame(), board, pieces: { player1: 1, player2: 1 } };
  const next = makeMove(state, { row: 1, col: 2 }, { row: 0, col: 1 });
  assert.deepEqual(next.board[0][1], { player: 'player1', type: 'king' });
  assert.equal(next.board[1][2], null);
  assert.equal(next.currentPlayer, 'player2');
  assert.deepEqual(state.board[1][2], { player: 'player1', type: 'normal' });
});
