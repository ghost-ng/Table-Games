import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getHangmanStage } from './hangmanStages';
import { createGame, guessLetter } from '../engines/hangman';

test('each miss maps directly to its image, including the empty platform', () => {
  for (const stage of [0, 1, 2, 3, 4, 5, 6] as const) {
    assert.equal(getHangmanStage(stage), stage);
  }
});

test('stage selection truncates fractions and clamps to available images', () => {
  for (const [input, expected] of [
    [-1, 0], [7, 6], [2.9, 2], [-0.9, 0], [6.9, 6],
    [Infinity, 6], [-Infinity, 0], [NaN, 0],
  ] as const) {
    assert.equal(getHangmanStage(input), expected);
  }
});

test('fresh and rematch-created state immediately selects stage zero', () => {
  let state = createGame('CAT');
  assert.equal(getHangmanStage(state.wrongGuesses), 0);
  for (const letter of ['B', 'D', 'E', 'F', 'G', 'H']) state = guessLetter(state, letter);
  assert.equal(state.isGameOver, true);
  assert.equal(getHangmanStage(state.wrongGuesses), 6);
  // The route creates its rematch using createGame(newWord).
  const rematch = createGame('DOG');
  assert.equal(getHangmanStage(rematch.wrongGuesses), 0);
  assert.equal(rematch.guessedLetters.size, 0);
});
