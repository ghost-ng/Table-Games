import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHangmanSession, completeHangmanRound } from './hangman-session';

test('session names are trimmed and blank names default independently', () => {
  assert.deepEqual(createHangmanSession('  Ada  ', '   ').names, {
    player1: 'Ada', player2: 'Player 2',
  });
  assert.deepEqual(createHangmanSession('', '  Grace  ').names, {
    player1: 'Player 1', player2: 'Grace',
  });
});

test('distinct Unicode names survive setup and length limits do not split code points', () => {
  assert.deepEqual(createHangmanSession('  Zoë 🐱  ', ' 李雷 ').names, {
    player1: 'Zoë 🐱', player2: '李雷',
  });
  assert.equal(createHangmanSession('🐱'.repeat(40), 'B').names.player1, '🐱'.repeat(24));
});

test('a new session starts round one with player one setting and player two guessing', () => {
  assert.deepEqual(createHangmanSession('Ada', 'Grace'), {
    names: { player1: 'Ada', player2: 'Grace' },
    setter: 'player1', guesser: 'player2',
    wins: { player1: 0, player2: 0 }, round: 1,
  });
});

test('a solved round awards the named guesser and swaps roles for the next round', () => {
  const session = createHangmanSession('Ada', 'Grace');
  const next = completeHangmanRound(session, true);
  assert.equal(session.names[session.guesser], 'Grace');
  assert.deepEqual(next.wins, { player1: 0, player2: 1 });
  assert.equal(next.setter, 'player2');
  assert.equal(next.guesser, 'player1');
  assert.equal(next.round, 2);
});

test('an unsolved round awards the named setter without mutating the completed session', () => {
  const session = createHangmanSession('Ada', 'Grace');
  Object.freeze(session.names);
  Object.freeze(session.wins);
  Object.freeze(session);
  const next = completeHangmanRound(session, false);
  assert.equal(session.names[session.setter], 'Ada');
  assert.deepEqual(next.wins, { player1: 1, player2: 0 });
  assert.deepEqual(session.wins, { player1: 0, player2: 0 });
  assert.equal(session.round, 1);
  assert.notEqual(next, session);
  assert.notEqual(next.names, session.names);
  assert.notEqual(next.wins, session.wins);
});

test('three consecutive rounds alternate roles and accumulate wins for the actual players', () => {
  const first = createHangmanSession('Zoë', '李雷');
  const second = completeHangmanRound(first, true);
  const third = completeHangmanRound(second, false);
  const fourth = completeHangmanRound(third, false);
  assert.deepEqual([second.setter, second.guesser, second.round, second.wins],
    ['player2', 'player1', 2, { player1: 0, player2: 1 }]);
  assert.deepEqual([third.setter, third.guesser, third.round, third.wins],
    ['player1', 'player2', 3, { player1: 0, player2: 2 }]);
  assert.deepEqual([fourth.setter, fourth.guesser, fourth.round, fourth.wins],
    ['player2', 'player1', 4, { player1: 1, player2: 2 }]);
  assert.deepEqual(fourth.names, { player1: 'Zoë', player2: '李雷' });
  assert.equal('secretWord' in fourth, false);
});
