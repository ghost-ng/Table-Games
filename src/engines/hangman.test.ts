import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, guessLetter, MAX_WRONG_GUESSES } from './hangman';

test('a new game gives the guesser six misses before losing', () => {
  const state = createGame('APPLE');
  assert.equal(state.wrongGuesses, 0);
  assert.equal(state.maxWrongGuesses - state.wrongGuesses, 6);
  assert.equal(state.maxWrongGuesses, MAX_WRONG_GUESSES);
  assert.equal(state.isGameOver, false);
});

test('correct and duplicate guesses preserve misses and reveal repeated letters', () => {
  const initial = createGame('APPLE');
  const correct = guessLetter(initial, 'p');
  assert.deepEqual(correct.displayWord, ['_', 'P', 'P', '_', '_']);
  assert.equal(correct.wrongGuesses, 0);
  assert.equal(guessLetter(correct, 'P'), correct);
  const wrong = guessLetter(correct, 'B');
  assert.equal(wrong.wrongGuesses, 1);
  assert.equal(guessLetter(wrong, 'b'), wrong);
  assert.equal(initial.guessedLetters.size, 0);
});

test('six distinct misses advance one step each and lose only on the sixth', () => {
  let state = createGame('APPLE');
  for (const [letter, misses, remaining, over] of [
    ['B', 1, 5, false], ['C', 2, 4, false], ['D', 3, 3, false],
    ['F', 4, 2, false], ['G', 5, 1, false], ['H', 6, 0, true],
  ] as const) {
    state = guessLetter(state, letter);
    assert.equal(state.wrongGuesses, misses);
    assert.equal(state.maxWrongGuesses - state.wrongGuesses, remaining);
    assert.equal(state.isGameOver, over);
    assert.equal(state.isWinner, false);
  }
  assert.equal(guessLetter(state, 'Z'), state);
});

test('invalid secret words are rejected before a round is created', () => {
  for (const word of ['', '   ', 'A1', 'TWO WORDS', 'APPLE!']) {
    assert.throws(() => createGame(word));
  }
});

test('invalid guesses leave the current round and miss count unchanged', () => {
  const state = guessLetter(createGame('APPLE'), 'B');
  for (const letter of ['', '   ', 'AP', '1', '!', 'é']) {
    assert.equal(guessLetter(state, letter), state);
    assert.equal(state.wrongGuesses, 1);
    assert.deepEqual([...state.guessedLetters], ['B']);
    assert.deepEqual(state.displayWord, ['_', '_', '_', '_', '_']);
  }
});

test('guessing every distinct letter wins and freezes the completed round', () => {
  let state = createGame('APPLE');
  for (const letter of ['a', 'p', 'l']) {
    state = guessLetter(state, letter);
    assert.equal(state.isWinner, false);
    assert.equal(state.isGameOver, false);
    assert.equal(state.wrongGuesses, 0);
  }
  state = guessLetter(state, 'e');
  assert.deepEqual(state.displayWord, ['A', 'P', 'P', 'L', 'E']);
  assert.equal(state.isWinner, true);
  assert.equal(state.isGameOver, true);
  assert.equal(state.wrongGuesses, 0);
  assert.equal(state.maxWrongGuesses - state.wrongGuesses, 6);
  assert.equal(guessLetter(state, 'Z'), state);
});
