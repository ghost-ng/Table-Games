import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import ts from 'typescript';
import * as engine from './boggle';
import { getAdjacentCells, traceWord, submitWord, createGame, isValidWord, type Board } from './boggle';

const seeBoard: Board = [
  ['S', 'E', 'E', 'X'], ['X', 'X', 'X', 'X'],
  ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X'],
];
const gameOn = (board: Board) => ({ ...createGame(), board });

test('adjacency includes diagonals but excludes the cube itself and out-of-board cells', () => {
  assert.deepEqual(getAdjacentCells(0, 0), [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }]);
  assert.deepEqual(getAdjacentCells(1, 1), [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 2 },
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
  ]);
});

test('shared submission accepts traceable SEE and records its score and three distinct tiles', () => {
  const initial = gameOn(seeBoard);
  const result = submitWord(initial, 'see');
  assert.equal(result.valid, true);
  assert.equal(isValidWord(seeBoard, 'see'), true);
  assert.deepEqual(result.state.foundWords.get('SEE'), {
    word: 'SEE', score: 1,
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  });
  assert.deepEqual(result.state.scores, { player1: 1, player2: 0 });
  assert.equal(initial.foundWords.size, 0);
});

test('shared validation normalizes surrounding whitespace consistently with typed input', () => {
  assert.equal(isValidWord(seeBoard, ' see '), true);
  const result = submitWord(gameOn(seeBoard), ' see ');
  assert.equal(result.valid, true);
  assert.equal(result.state.foundWords.get('SEE')?.score, 1);
});

test('shared submission keeps minimum length, dictionary rejection, and completed games', () => {
  const initial = gameOn(seeBoard);
  assert.equal(submitWord(initial, 'SE').reason, 'Word must be at least 3 letters');
  assert.equal(submitWord(initial, 'SEEX').reason, 'Word not in dictionary');
  assert.equal(submitWord({ ...initial, isGameOver: true }, 'SEE').reason, 'Game is over');
  assert.deepEqual(initial.scores, { player1: 0, player2: 0 });
});

test('shared submission rejects SEE when its second E is separated from the first', () => {
  const board: Board = [
    ['S', 'E', 'X', 'X'], ['X', 'X', 'X', 'X'],
    ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'E'],
  ];
  const initial = gameOn(board);
  const result = submitWord(initial, 'SEE');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'Word cannot be traced on board');
  assert.equal(result.state, initial);
});

test('shared submission cannot reuse one E tile to fake SEE', () => {
  const board = seeBoard.map(row => [...row]);
  board[0][2] = 'X';
  assert.equal(submitWord(gameOn(board), 'SEE').valid, false);
});

test('SEE scores once per player while both multiplayer turns can find it', () => {
  const first = submitWord(gameOn(seeBoard), 'SEE');
  const duplicate = submitWord(first.state, 'see');
  assert.equal(duplicate.valid, false);
  assert.equal(duplicate.reason, 'Word already found');
  assert.equal(duplicate.state, first.state);
  const secondPlayer = submitWord({ ...first.state, currentPlayer: 'player2' }, 'SEE');
  assert.equal(secondPlayer.valid, true);
  assert.deepEqual(secondPlayer.state.scores, { player1: 1, player2: 1 });
  assert.equal(secondPlayer.state.foundWordsP2.get('SEE')?.score, 1);
});

test('shared dictionary accepts 12dicts vocabulary outside the former hand-written list', () => {
  const board: Board = [
    ['Z', 'Y', 'G', 'O'], ['X', 'X', 'E', 'T'],
    ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X'],
  ];
  const result = submitWord(gameOn(board), 'ZYGOTE');
  assert.equal(result.valid, true);
  assert.equal(result.state.scores.player1, 3);
});

test('shared dictionary retains playable 3of6game neologisms after removing their suffix annotations', () => {
  const board: Board = [
    ['B', 'I', 'T', 'C'], ['X', 'N', 'I', 'O'],
    ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X'],
  ];
  const result = submitWord(gameOn(board), 'BITCOIN');
  assert.equal(result.valid, true);
  assert.equal(result.state.scores.player1, 5);
});

// Exercise the screen's real callback body without emulating React Native hooks.
// The harness supplies only its lexical state and observes updates/feedback.
function runScreenSubmission(word: string, tapped = false, player2 = false) {
  const source = readFileSync(new URL('../../app/games/boggle.tsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('boggle.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'handleSubmitWord') {
      callback = (node.initializer as ts.CallExpression).arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(callback, 'Screen has a submission callback');
  const initial = gameOn(seeBoard);
  let updated = initial;
  let feedback = { text: '', isError: false };
  const bindings = {
    ...engine,
    gameState: initial, isGameOver: false, timeRemaining: 120_000,
    currentInput: word,
    currentPlayer: player2 ? 'player2' : 'player1',
    tapPath: tapped ? [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] : [],
    clearWord: () => {}, inputRef: { current: null },
    setGameState: (next: engine.GameState | ((state: engine.GameState) => engine.GameState)) => {
      updated = typeof next === 'function' ? next(updated) : next;
    },
    showFeedback: (text: string, isError: boolean) => { feedback = { text, isError }; },
  };
  const js = ts.transpileModule(`(${callback.getText(file)})()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function(...Object.keys(bindings), js)(...Object.values(bindings));
  return { updated, feedback };
}

for (const tapped of [false, true]) {
  test(`Word Grid ${tapped ? 'traced' : 'typed'} input accepts SEE through shared submission`, () => {
    const { updated, feedback } = runScreenSubmission('SEE', tapped);
    assert.equal(feedback.isError, false, feedback.text);
    assert.equal(updated.scores.player1, 1);
    assert.equal(updated.foundWords.get('SEE')?.score, 1);
  });
}

test('Word Grid submission preserves the active multiplayer player', () => {
  const { updated, feedback } = runScreenSubmission('SEE', true, true);
  assert.equal(feedback.isError, false, feedback.text);
  assert.deepEqual(updated.scores, { player1: 0, player2: 1 });
  assert.equal(updated.foundWordsP2.get('SEE')?.score, 1);
});

test('tracing keeps ordered adjacent cubes, expands QU, and rejects cube reuse', () => {
  const board: Board = [['QU', 'I', 'T', 'X'], ['C', 'A', 'X', 'X'], ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X']];
  assert.deepEqual(traceWord(board, 'QUIT'), [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]);
  assert.deepEqual(traceWord(board, 'CAT'), [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 2 }]);
  assert.equal(traceWord(board, 'CAC'), null);
  assert.equal(traceWord(board, 'QIT'), null);
  assert.deepEqual(board[0], ['QU', 'I', 'T', 'X']);
});
