import './preview-server.test.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { accessSync, chmodSync, constants, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const shellFiles = ['lib.sh', 'install.sh', 'build.sh', 'run.sh', 'verify.sh'];

function fixture(t, { nodeVersion = 'v22.19.0', npmVersion = '11.4.2' } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'table-games-wsl-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'Repository With Spaces');
  const bin = join(temporary, 'fake tools');
  const log = join(temporary, 'npm.log');
  mkdirSync(join(root, 'scripts/wsl'), { recursive: true });
  mkdirSync(bin);
  for (const file of shellFiles) {
    const source = join(sourceRoot, 'scripts/wsl', file);
    if (existsSync(source)) cpSync(source, join(root, 'scripts/wsl', file));
  }
  const cleanSource = join(sourceRoot, 'scripts/clean.mjs');
  if (existsSync(cleanSource)) cpSync(cleanSource, join(root, 'scripts/clean.mjs'));
  writeFileSync(join(root, 'package.json'), '{}\n');
  writeFileSync(join(bin, 'node'), '#!/bin/bash\nprintf "%s\\n" "$FAKE_NODE_VERSION"\n');
  writeFileSync(join(bin, 'npm'), '#!/bin/bash\nif [[ "$1" == "--version" ]]; then printf "%s\\n" "$FAKE_NPM_VERSION"; exit 0; fi\n{ printf "cwd=%s\\n" "$PWD"; printf "base=%s\\n" "${EXPO_BASE_URL-}"; printf "arg=%s\\n" "$@"; } >> "$NPM_LOG"\n');
  chmodSync(join(bin, 'node'), 0o755);
  chmodSync(join(bin, 'npm'), 0o755);
  const env = { ...process.env, PATH: `${bin}:/usr/bin:/bin`, FAKE_NODE_VERSION: nodeVersion, FAKE_NPM_VERSION: npmVersion, NPM_LOG: log };
  delete env.EXPO_BASE_URL;
  return {
    root, temporary, log, env,
    run: (script, args = [], overrides = {}) => spawnSync('/bin/bash', [join(root, 'scripts/wsl', script), ...args], { cwd: temporary, env: { ...env, ...overrides }, encoding: 'utf8' }),
    calls: () => existsSync(log) ? readFileSync(log, 'utf8') : '',
    clean: () => spawnSync(process.execPath, [join(root, 'scripts/clean.mjs')], { cwd: temporary, encoding: 'utf8' }),
  };
}

function success(result) {
  assert.equal(result.status, 0, result.stderr || result.error?.message);
}

test('all WSL scripts parse under bash and are executable', () => {
  for (const file of shellFiles) {
    const path = join(sourceRoot, 'scripts/wsl', file);
    assert.ok(existsSync(path), `${file} must exist`);
    accessSync(path, constants.X_OK);
    success(spawnSync('/bin/bash', ['-n', path], { encoding: 'utf8' }));
  }
});

test('wrappers resolve a repository path containing spaces', (t) => {
  const f = fixture(t);
  for (const [script, args] of [['install.sh', ['ci']], ['build.sh', ['run', 'build']], ['run.sh', ['run', 'start']], ['verify.sh', ['run', 'verify:all']]]) {
    success(f.run(script));
    const calls = f.calls();
    assert.ok(calls.includes(`cwd=${f.root}\n`), `${script} must run from the repository`);
    assert.ok(calls.endsWith(args.map((arg) => `arg=${arg}\n`).join('')), `${script} must invoke the expected npm command`);
  }
});

test('toolchain validation rejects Node 18 with a Node 22 instruction', (t) => {
  const f = fixture(t, { nodeVersion: 'v18.19.1' });
  for (const script of ['install.sh', 'build.sh', 'run.sh', 'verify.sh']) {
    const result = f.run(script);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Node(?:\.js)? 22/i);
  }
  assert.equal(f.calls(), '', 'unsupported Node must not invoke npm work');
});

test('run mode rejects unknown values without starting Expo', (t) => {
  const f = fixture(t);
  const result = f.run('run.sh', ['unknown']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dev.*preview/i);
  assert.equal(f.calls(), '');
});

test('preview mode forwards an explicit numeric port', (t) => {
  const f = fixture(t);
  success(f.run('run.sh', ['preview', '4321']));
  assert.ok(f.calls().endsWith('arg=run\narg=preview\narg=--\narg=4321\n'));
});

test('preview mode forwards a configured base with and without a port', (t) => {
  const f = fixture(t);
  success(f.run('run.sh', ['preview', '--base', '/Table-Games/']));
  assert.ok(f.calls().endsWith('arg=run\narg=preview\narg=--\narg=--base\narg=/Table-Games/\n'));
  success(f.run('run.sh', ['preview', '4321', '--base', '/Table-Games/']));
  assert.ok(f.calls().endsWith('arg=run\narg=preview\narg=--\narg=4321\narg=--base\narg=/Table-Games/\n'));
});

test('development mode forwards an explicit numeric port', (t) => {
  const f = fixture(t);
  success(f.run('run.sh', ['dev', '8082']));
  assert.ok(f.calls().endsWith('arg=run\narg=start\narg=--\narg=--port\narg=8082\n'));
});

test('run mode rejects invalid and out-of-range ports before npm work', (t) => {
  const f = fixture(t);
  for (const port of ['', '0', '65536', '-1', 'abc', '1.5', '12;echo nope']) {
    const result = f.run('run.sh', ['preview', port]);
    assert.notEqual(result.status, 0, `port ${JSON.stringify(port)} must fail`);
    assert.match(result.stderr, /port/i);
  }
  assert.equal(f.calls(), '');
});

test('toolchain validation rejects npm older than 10 before npm work', (t) => {
  const f = fixture(t, { npmVersion: '9.9.4' });
  const result = f.run('install.sh');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /npm 10/i);
  assert.equal(f.calls(), '');
});

test('build preserves the requested Expo base path', (t) => {
  const f = fixture(t);
  success(f.run('build.sh', [], { EXPO_BASE_URL: '/Table-Games' }));
  assert.ok(f.calls().includes('base=/Table-Games\n'));
});

test('clean removes only repository dist and Expo cache from another directory', (t) => {
  const f = fixture(t);
  for (const name of ['dist', '.expo', 'keep']) {
    mkdirSync(join(f.root, name));
    writeFileSync(join(f.root, name, 'marker'), name);
  }
  success(f.clean());
  assert.equal(existsSync(join(f.root, 'dist')), false);
  assert.equal(existsSync(join(f.root, '.expo')), false);
  assert.equal(readFileSync(join(f.root, 'keep/marker'), 'utf8'), 'keep');
  success(f.clean());
});

test('clean rejects a symlink target before deleting any directories', (t) => {
  const f = fixture(t);
  const outside = join(f.temporary, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'marker'), 'preserve');
  mkdirSync(join(f.root, 'dist'));
  writeFileSync(join(f.root, 'dist/marker'), 'preserve dist');
  symlinkSync(outside, join(f.root, '.expo'), 'dir');
  const result = f.clean();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refus|unsafe|symlink/i);
  assert.equal(readFileSync(join(outside, 'marker'), 'utf8'), 'preserve');
  assert.equal(readFileSync(join(f.root, 'dist/marker'), 'utf8'), 'preserve dist');
});
