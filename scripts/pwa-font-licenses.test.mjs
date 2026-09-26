import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = fileURLToPath(new URL('../', import.meta.url));
const files = ['FONT-NOTICES.json', 'OFL-1.1.txt'];

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'pwa font licenses '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  for (const file of ['build-pwa.mjs', 'sw.template.js', 'font-licenses.mjs']) cpSync(join(source, 'scripts', file), join(root, 'scripts', file));
  cpSync(join(source, 'assets/fonts'), join(root, 'assets/fonts'), { recursive: true });
  cpSync(join(source, 'public/licenses'), join(root, 'public/licenses'), { recursive: true });
  cpSync(join(source, 'public/licenses'), join(root, 'dist/licenses'), { recursive: true });
  writeFileSync(join(root, 'dist/index.html'), '<html><head><meta name="viewport" content="width=device-width"></head><body>Fixture</body></html>');
  return {
    root,
    run: (base = '') => spawnSync(process.execPath, [join(root, 'scripts/build-pwa.mjs')], { env: { ...process.env, EXPO_BASE_URL: base }, encoding: 'utf8' }),
  };
}

for (const base of ['', '/Table-Games']) {
  test(`PWA postprocessing retains and precaches the complete font licenses at ${base || '/'}`, (t) => {
    const { root, run } = fixture(t);
    const result = run(base);
    assert.equal(result.status, 0, result.stderr);
    for (const file of files) {
      assert.deepEqual(readFileSync(join(root, 'dist/licenses', file)), readFileSync(join(root, 'public/licenses', file)));
      assert.ok(readFileSync(join(root, 'dist/sw.js'), 'utf8').includes(`licenses/${file}`));
    }
    assert.ok(readFileSync(join(root, 'dist/index.html'), 'utf8').includes(`register('${base}/sw.js'`));
  });
}

for (const file of files) {
  test(`PWA postprocessing rejects an artifact missing ${file}`, (t) => {
    const { root, run } = fixture(t);
    rmSync(join(root, 'dist/licenses', file));
    const result = run();
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /font license/i);
  });
}

test('PWA postprocessing rejects a font notice artifact changed from source', (t) => {
  const { root, run } = fixture(t);
  writeFileSync(join(root, 'dist/licenses/FONT-NOTICES.json'), '{}');
  const result = run('/Table-Games');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /font license/i);
});
