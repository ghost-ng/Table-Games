import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checker = fileURLToPath(new URL('./public-readiness.mjs', import.meta.url));
const games = 'Tic Tac Toe, Four in a Row, Checkers, Chinese Checkers, Mancala, Pop & Race, Dots & Boxes, Hangman, Word Search, Crossword, Word Grid, Word Guess; Coin Flip, Dice.';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'public readiness '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  spawnSync('git', ['init', '-q', root]);
  put('LICENSE', 'Copyright 2026 ghost-ng. All Rights Reserved. Copying, modification, distribution, sublicensing and commercial use require prior written permission.');
  put('README.md', `${games}\n\n\`npm ci\`\n\`npm run build\`\n\`./scripts/wsl/run.sh preview\`\n`);
  put('SECURITY.md', 'Use GitHub private vulnerability reporting: https://github.com/ghost-ng/Table-Games/security/advisories/new and https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/privately-reporting-a-security-vulnerability . Do not disclose credentials in public issues.');
  put('package.json', JSON.stringify({ private: true, license: 'UNLICENSED', scripts: { build: 'echo build' } }));
  put('package-lock.json', '{}');
  put('scripts/wsl/run.sh', '#!/bin/bash\n');
  const track = () => assert.equal(spawnSync('git', ['add', '.'], { cwd: root }).status, 0);
  const run = (...args) => spawnSync(process.execPath, [checker, ...args], { cwd: root, encoding: 'utf8' });
  track();
  return { put, track, run };
}

test('accepts a documented proprietary tree and ignores untracked generated output', (t) => {
  const { put, run } = fixture(t);
  put('dist/index.html', 'generated');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS/);
});

test('rejects missing policy, missing product names and undefined documented commands', (t) => {
  const { put, run } = fixture(t);
  put('LICENSE', 'MIT');
  put('README.md', 'Tic Tac Toe\n`npm run missing`\n`./scripts/wsl/missing.sh`');
  put('SECURITY.md', 'File a public issue.');
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /LICENSE/);
  assert.match(result.stderr, /Word Grid/);
  assert.match(result.stderr, /missing/);
  assert.match(result.stderr, /SECURITY/);
});

test('rejects trademark alternatives in the README game list and accidental npm publication', (t) => {
  const { put, run } = fixture(t);
  put('README.md', `${games}\nBoggle`);
  put('package.json', JSON.stringify({ private: false, license: 'MIT', scripts: { build: 'echo build' } }));
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /generic/);
  assert.match(result.stderr, /private/);
});

test('rejects tracked internal docs unless the temporary plan flag is supplied', (t) => {
  const { put, track, run } = fixture(t);
  for (const path of ['CLAUDE.md', 'docs/superpowers/plans/design.md', '.superpowers/sdd/active.md']) put(path, 'internal');
  track();
  assert.equal(run().status, 1);
  const allowed = run('--allow-internal-plans');
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.match(allowed.stdout, /3 internal/);
});

test('the temporary plan flag never permits tracked generated artifacts or environment files', (t) => {
  const { put, track, run } = fixture(t);
  for (const path of ['dist/index.html', 'node_modules/demo/index.js', '.expo/config.json', '.playwright-cli/snapshot.yml', '.env', '.env.example']) put(path, 'artifact');
  track();
  const result = run('--allow-internal-plans');
  assert.equal(result.status, 1);
  for (const path of ['dist/', 'node_modules/', '.expo/', '.playwright-cli/', '.env']) assert.ok(result.stderr.includes(path), result.stderr);
});

test('temporarily permits placeholder mentions only in recognized internal plan paths', (t) => {
  const { put, track, run } = fixture(t);
  put('docs/superpowers/plans/plan.md', ['YOUR', 'APPLE_ID'].join('_'));
  put('docs/superpowers/specs/spec.md', ['YOUR', 'ASC_APP_ID'].join('_'));
  put('.superpowers/sdd/brief.md', ['YOUR', 'TEAM_ID'].join('_'));
  track();
  assert.equal(run('--allow-internal-plans').status, 0);
  assert.equal(run().status, 1);
  put('eas.json', JSON.stringify({ appleId: ['YOUR', 'APPLE_ID'].join('_') }));
  put('CLAUDE.md', ['YOUR', 'TEAM_ID'].join('_'));
  put('docs/superpowers/other.md', ['YOUR', 'ASC_APP_ID'].join('_'));
  track();
  const result = run('--allow-internal-plans');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /placeholder/);
  for (const path of ['eas.json', 'CLAUDE.md', 'docs/superpowers/other.md']) assert.ok(result.stderr.includes(path), result.stderr);
});

test('the plan exception still rejects likely credentials inside allowed plans', (t) => {
  const { put, track, run } = fixture(t);
  put('docs/superpowers/plans/plan.md', ['ghp', 'A'.repeat(36)].join('_'));
  track();
  const result = run('--allow-internal-plans');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Likely credential: docs\/superpowers\/plans\/plan.md/);
});

test('rejects likely credentials without printing their values', (t) => {
  const { put, track, run } = fixture(t);
  const token = ['ghp', 'A'.repeat(36)].join('_');
  put('config.json', JSON.stringify({ accessToken: token }));
  track();
  const result = run('--allow-internal-plans');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /credential/);
  assert.ok(!result.stderr.includes(token));
});

test('rejects private keys and secret assignments while allowing package integrity hashes', (t) => {
  const { put, track, run } = fixture(t);
  put('package-lock.json', JSON.stringify({ integrity: 'sha512-' + 'A'.repeat(80) }));
  assert.equal(run().status, 0);
  put('credentials.txt', '-----BEGIN ' + 'RSA PRIVATE KEY-----\n');
  put('config.js', 'const API_SECRET = "' + 'A'.repeat(32) + '";');
  track();
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /credentials.txt/);
  assert.match(result.stderr, /config.js/);
});

test('rejects unsupported flags instead of silently weakening the gate', (t) => {
  const { run } = fixture(t);
  const result = run('--allow-secrets');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown/);
});
