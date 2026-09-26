import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getHangmanStage } from './hangmanStages';

test('each miss maps directly to its image, including the empty gallows', () => {
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
