import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_VISUAL_PATHS, THEME_NAMES, DICE_KINDS, HANGMAN_STAGES, REQUIRED_FILES } from './catalog';

test('every theme supplies all game families and complete variant sets', () => {
  assert.deepEqual([...THEME_NAMES].sort(), ['arcade', 'modern', 'retro']);
  assert.deepEqual(DICE_KINDS, ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);
  assert.deepEqual(HANGMAN_STAGES, [0, 1, 2, 3, 4, 5, 6]);
  for (const theme of THEME_NAMES) {
    const visuals = GAME_VISUAL_PATHS[theme];
    assert.deepEqual(Object.keys(visuals).sort(), ['checkers', 'chineseCheckers', 'coinFlip', 'connectFour', 'dice', 'hangman', 'mancala', 'ticTacToe', 'trouble']);
    assert.deepEqual(Object.keys(visuals.dice), DICE_KINDS);
    assert.deepEqual(Object.keys(visuals.hangman).map(Number), HANGMAN_STAGES);
    assert.equal(visuals.chineseCheckers.marbles.length, 6);
    assert.equal(visuals.mancala.seeds.length, 6);
    assert.equal(visuals.trouble.pawns.length, 4);
    assert.equal(Object.keys(visuals.checkers).length, 3);
    assert.equal(Object.keys(visuals.coinFlip).length, 3);
    assert.equal(Object.keys(visuals.ticTacToe).length, 2);
    assert.equal(Object.keys(visuals.connectFour).length, 2);
    const paths = Object.values(visuals).flatMap((family) => Object.values(family).flat());
    assert.equal(paths.length, 39);
    assert.equal(new Set(paths).size, 39);
    const expected = Object.entries(REQUIRED_FILES).flatMap(([family, files]) => files.map((file) => `assets/pieces/${theme}/${family}/${file}`));
    assert.deepEqual(paths.sort(), expected.sort());
    for (const path of paths) {
      assert.ok(typeof path === 'string');
      assert.ok(path.startsWith(`assets/pieces/${theme}/`));
      assert.ok(path.endsWith('.webp'));
      assert.ok(!path.includes('..'));
    }
  }
});

// These Modern sheets are blue first, red second; semantic player 1 is red.
for (const family of ['connectFour', 'checkers'] as const) {
  test('Modern ' + family + ' maps player 1 to red and player 2 to blue', () => {
    const directory = family === 'connectFour' ? 'connect-four' : 'checkers';
    assert.equal(GAME_VISUAL_PATHS.modern[family].player1, 'assets/pieces/modern/' + directory + '/player-2.webp');
    assert.equal(GAME_VISUAL_PATHS.modern[family].player2, 'assets/pieces/modern/' + directory + '/player-1.webp');
  });
}

test('Modern race seats follow red, blue, green, yellow ownership', () => {
  assert.deepEqual(GAME_VISUAL_PATHS.modern.trouble.pawns, [
    'assets/pieces/modern/trouble/pawn-2.webp', 'assets/pieces/modern/trouble/pawn-1.webp',
    'assets/pieces/modern/trouble/pawn-3.webp', 'assets/pieces/modern/trouble/pawn-4.webp',
  ]);
});
