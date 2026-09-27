import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, evaluateGuess, getKeyboardStates, submitGuess } from './wordle';

test('duplicate guesses claim exact matches first and never exceed answer letter counts', () => {
  assert.deepEqual(evaluateGuess('ALLEY', 'APPLE'), ['correct', 'present', 'absent', 'present', 'absent']);
  assert.deepEqual(evaluateGuess('PAPAL', 'APPLE'), ['present', 'present', 'correct', 'absent', 'present']);
  assert.deepEqual(evaluateGuess('AAAAA', 'APPLE'), ['correct', 'absent', 'absent', 'absent', 'absent']);
  assert.deepEqual(evaluateGuess('APPLE', 'APPLE'), ['correct', 'correct', 'correct', 'correct', 'correct']);
});

test('submitted evaluation and keyboard state keep the strongest duplicate-letter result', () => {
  const initial = createGame('apple');
  const next = submitGuess(initial, 'alley');
  assert.deepEqual(next.guesses, ['ALLEY']);
  assert.deepEqual(next.evaluations, [['correct', 'present', 'absent', 'present', 'absent']]);
  assert.deepEqual(getKeyboardStates(next), { A: 'correct', L: 'present', E: 'present', Y: 'absent' });
  assert.deepEqual(initial.guesses, []);
});
