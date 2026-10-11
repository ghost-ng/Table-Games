import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const builder = new URL('./build-boggle-dictionary.mjs', import.meta.url);
const vendored = new URL('../vendor/wordlists/12dicts/3of6game.txt', import.meta.url);
const committed = new URL('../src/data/boggle-dictionary.generated.ts', import.meta.url);

function fixture(t, text = 'see\r\nCAT\r\ncat\r\nquit\r\nselfie!\r\nzygote+\r\nprolog&\r\naqualung^\r\nboyhoods$\r\na\r\nat\r\nsea-lion\r\ncan\'t\r\nhello world\r\ncafé\r\n') {
  const dir = mkdtempSync(join(tmpdir(), 'boggle-dictionary-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source.txt');
  const output = join(dir, 'generated.ts');
  writeFileSync(source, text);
  return { source, output, run: (...extra) => spawnSync(process.execPath, [
    '--import', 'data:text/javascript,globalThis.fetch=()=>{throw new Error("Network forbidden")}',
    fileURLToPath(builder), '--source', source, '--output', output, ...extra,
  ], { encoding: 'utf8', env: { ...process.env, HTTP_PROXY: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1' } }) };
}

test('builder works offline and normalizes annotated alphabetic words into sorted unique output', t => {
  const { output, run } = fixture(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const content = readFileSync(output, 'utf8');
  const packed = JSON.parse(content.match(/export const BOGGLE_WORDS = (".*");/)[1]);
  assert.deepEqual(packed.split('\n'), ['AQUALUNG', 'BOYHOODS', 'CAT', 'PROLOG', 'QUIT', 'SEE', 'SELFIE', 'ZYGOTE']);
  assert.equal(run().status, 0);
  assert.equal(readFileSync(output, 'utf8'), content);
});

test('check mode rejects stale output without overwriting it', t => {
  const { output, run } = fixture(t);
  assert.equal(run().status, 0);
  assert.equal(run('--check').status, 0);
  writeFileSync(output, 'stale artifact\n');
  const result = run('--check');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /stale|out of date/i);
  assert.equal(readFileSync(output, 'utf8'), 'stale artifact\n');
});

test('builder refuses an incomplete list missing required SEE sentinel', t => {
  assert.ok(existsSync(builder), 'Offline dictionary builder must exist');
  const { run } = fixture(t, 'cat\nquit\nzygote\n');
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SEE/);
});

test('committed artifact regenerates from vendored source without network access', () => {
  assert.ok(existsSync(vendored), 'Approved source must be committed locally');
  assert.ok(existsSync(committed), 'Generated dictionary must be committed locally');
  assert.ok(readFileSync(vendored).length > 100_000);
  assert.ok(readFileSync(committed).length > 100_000);
  const result = spawnSync(process.execPath, [
    '--import', 'data:text/javascript,globalThis.fetch=()=>{throw new Error("Network forbidden")}',
    fileURLToPath(builder), '--check',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
