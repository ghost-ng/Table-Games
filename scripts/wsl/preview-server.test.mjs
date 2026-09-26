import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const html = '<!doctype html><title>Preview fixture</title>';
const manifest = '{"name":"Preview fixture","scope":"/Table-Games/"}';

async function preview(t, { base = '/', envBase } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'table-games-preview-'));
  const root = join(temporary, 'Repository With Spaces');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'dist/assets'), { recursive: true });
  mkdirSync(join(root, 'dist/licenses'), { recursive: true });
  cpSync(join(sourceRoot, 'scripts/serve.mjs'), join(root, 'scripts/serve.mjs'));
  for (const [path, content] of [
    ['index.html', html], ['manifest.webmanifest', manifest],
    ['sw.js', 'self.previewWorker = true;'],
    ['assets/app.js', 'window.previewScript = true;'],
    ['assets/theme.css', 'body { color: red; }'],
    ['assets/piece.png', Buffer.from([137, 80, 78, 71])],
    ['assets/with space.js', 'window.encodedAsset = true;'],
    ['licenses/OFL-1.1.txt', 'Font license fixture\n'],
    ['licenses/FONT-NOTICES.json', '{"title":"Font notices fixture"}'],
  ]) writeFileSync(join(root, 'dist', path), content);
  writeFileSync(join(root, 'outside.txt'), 'secret outside dist');
  symlinkSync(join(root, 'outside.txt'), join(root, 'dist/leak.txt'));
  // Reserve a free port, then release it immediately before starting the real CLI.
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  const env = { ...process.env, EXPO_BASE_URL: envBase ?? '' };
  const args = [join(root, 'scripts/serve.mjs'), String(port)];
  if (envBase === undefined) args.push('--base', base);
  const child = spawn(process.execPath, args, { cwd: temporary, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = '';
  child.stderr.on('data', (chunk) => { errors += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
    rmSync(temporary, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Preview did not start: ${errors}`)), 5000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Preview exited ${code}: ${errors}`)); });
    child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
  });
  return (path) => new Promise((resolve, reject) => {
    // Raw paths ensure traversal requests are not normalized by the test client.
    const req = request({ hostname: '127.0.0.1', port, path }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('preview serves manifest, worker and static assets under a configured base', async (t) => {
  const get = await preview(t, { base: '/Table-Games///' });
  const result = await get('/Table-Games/manifest.webmanifest?version=1');
  assert.equal(result.status, 200);
  assert.equal(result.headers['content-type'], 'application/manifest+json');
  assert.equal(result.body.toString(), manifest);
  for (const [path, type, body] of [
    ['sw.js', 'text/javascript; charset=utf-8', 'self.previewWorker = true;'],
    ['assets/app.js', 'text/javascript; charset=utf-8', 'window.previewScript = true;'],
    ['assets/theme.css', 'text/css; charset=utf-8', 'body { color: red; }'],
    ['assets/with%20space.js', 'text/javascript; charset=utf-8', 'window.encodedAsset = true;'],
  ]) {
    const asset = await get(`/Table-Games/${path}`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers['content-type'], type);
    assert.equal(asset.body.toString(), body);
    if (path === 'sw.js') assert.equal(asset.headers['cache-control'], 'no-cache');
  }
  const image = await get('/Table-Games/assets/piece.png');
  assert.equal(image.headers['content-type'], 'image/png');
  assert.deepEqual(image.body, Buffer.from([137, 80, 78, 71]));
});

test('preview uses EXPO_BASE_URL and falls back to the SPA only within that base', async (t) => {
  const get = await preview(t, { envBase: '/Table-Games' });
  for (const path of ['/Table-Games/', '/Table-Games/games/hangman']) {
    const result = await get(path);
    assert.equal(result.status, 200);
    assert.equal(result.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(result.body.toString(), html);
  }
  for (const path of ['/', '/manifest.webmanifest', '/Table-Games-other/manifest.webmanifest']) {
    const result = await get(path);
    assert.equal(result.status, 404, path);
    assert.notEqual(result.body.toString(), html);
  }
});

test('preview preserves root-base assets and SPA fallback', async (t) => {
  const get = await preview(t);
  const asset = await get('/manifest.webmanifest');
  assert.equal(asset.status, 200);
  assert.equal(asset.headers['content-type'], 'application/manifest+json');
  assert.equal(asset.body.toString(), manifest);
  const route = await get('/games/hangman');
  assert.equal(route.status, 200);
  assert.equal(route.body.toString(), html);
});

test('preview rejects unsafe paths and malformed encoding without leaking files or crashing', async (t) => {
  const get = await preview(t, { base: '/Table-Games/' });
  for (const path of [
    '/Table-Games/../outside.txt', '/Table-Games/%2e%2e/outside.txt',
    '/Table-Games/%2e%2e%2foutside.txt', '/Table-Games/assets%2fapp.js',
    '/Table-Games/%5c..%5coutside.txt', '/Table-Games/%00', '/Table-Games/%GG',
    '/Table-Games/leak.txt',
  ]) {
    const result = await get(path);
    assert.ok([400, 403].includes(result.status), `${path}: ${result.status}`);
    assert.notEqual(result.body.toString(), 'secret outside dist');
    assert.notEqual(result.body.toString(), html);
  }
  assert.equal((await get('/Table-Games/manifest.webmanifest')).status, 200);
});

for (const base of ['/', '/Table-Games/']) {
  test(`preview serves readable third-party license bytes under ${base}`, async (t) => {
    const get = await preview(t, { base });
    for (const [file, contentType, body] of [
      ['OFL-1.1.txt', 'text/plain; charset=utf-8', 'Font license fixture\n'],
      ['FONT-NOTICES.json', 'application/json', '{"title":"Font notices fixture"}'],
    ]) {
      const result = await get(`${base}licenses/${file}`);
      assert.equal(result.status, 200);
      assert.equal(result.headers['content-type'], contentType);
      assert.equal(result.body.toString(), body);
    }
  });
}
