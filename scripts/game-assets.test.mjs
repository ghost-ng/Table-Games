import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync, realpathSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync, symlinkSync, linkSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import sharp from 'sharp';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const art = await import('./game-art-lib.mjs');
const normalizer = await import('./normalize-game-art.mjs');
const visibleBounds = { minFill: 0.72, maxFill: 0.80, safePadding: 0.10 };

async function loadModernHangmanGenerator() {
  try {
    return await import('./generate-modern-hangman.mjs');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  }
}

async function loadRetroHangmanGenerator() {
  try {
    return await import('./generate-retro-hangman.mjs');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  }
}

async function loadArcadeHangmanGenerator() {
  try {
    return await import('./generate-arcade-hangman.mjs');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  }
}

function requireHelper(name) {
  assert.equal(typeof art[name], 'function', `${name} must implement the individual-asset contract`);
  return art[name];
}

async function fixture({ width = 100, height = width, alpha = true,
  rectangles = [{ left: 12, top: 12, width: 76, height: 76, alpha: 255 }] } = {}) {
  const channels = alpha ? 4 : 3;
  const data = Buffer.alloc(width * height * channels);
  for (const rect of rectangles) {
    for (let y = rect.top; y < rect.top + rect.height; y++) {
      for (let x = rect.left; x < rect.left + rect.width; x++) {
        const offset = (y * width + x) * channels;
        [data[offset], data[offset + 1], data[offset + 2]] = rect.color ?? [20, 100, 200];
        if (alpha) data[offset + 3] = rect.alpha ?? 255;
      }
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

function individualRecord(overrides = {}) {
  return { theme: 'modern', family: 'tic-tac-toe', role: 'x', prompt: 'One centered ceramic X, genuine alpha, no text.',
    sourcePath: 'docs/design/source-art/modern/tic-tac-toe/x.png', finalPath: 'assets/pieces/modern/tic-tac-toe/x.webp',
    targetSize: 96, visibleBounds, generatedAt: '2026-09-27T00:00:00Z', reviewedAt: '2026-09-27T00:01:00Z', ...overrides };
}

function manifestFixture(record = individualRecord(), stage = 'individual-assets') {
  return { schemaVersion: 1, stage, records: [record] };
}
// Transpile only the pure catalog; no React Native or bitmap module is loaded.
function loadTs(relativePath, localRequire = require) {
  const output = ts.transpileModule(readFileSync(resolve(root, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}

function assertHangmanStages(stages, theme) {
  assert.deepEqual(Object.keys(stages), ['0', '1', '2', '3', '4', '5', '6'], `${theme}: stages 0–6 are required`);
  const files = Object.values(stages).map((file) => realpathSync(resolve(root, file)));
  assert.equal(new Set(files).size, 7, `${theme}: seven distinct resolved Hangman files are required`);
}

test('Hangman validation rejects a duplicated stage file without changing production assets', () => {
  const { GAME_VISUAL_PATHS } = loadTs('src/game-visuals/catalog.ts');
  const duplicated = { ...GAME_VISUAL_PATHS.modern.hangman, 6: GAME_VISUAL_PATHS.modern.hangman[5] };
  assert.throws(() => assertHangmanStages(duplicated, 'modern'), /seven distinct resolved Hangman files/);
});

test('Hangman validation rejects an omitted stage without changing production assets', () => {
  const { GAME_VISUAL_PATHS } = loadTs('src/game-visuals/catalog.ts');
  const omitted = { ...GAME_VISUAL_PATHS.retro.hangman };
  delete omitted[3];
  assert.throws(() => assertHangmanStages(omitted, 'retro'), /stages 0–6 are required/);
});

test('production assets exist, contain WebP data, and belong to their theme', () => {
  const { THEME_NAMES, GAME_VISUAL_PATHS } = loadTs('src/game-visuals/catalog.ts');
  for (const theme of THEME_NAMES) {
    assertHangmanStages(GAME_VISUAL_PATHS[theme].hangman, theme);
    const base = realpathSync(resolve(root, 'assets/pieces', theme)) + sep;
    const hashes = new Set();
    const paths = Object.values(GAME_VISUAL_PATHS[theme]).flatMap((family) => Object.values(family).flat());
    assert.equal(paths.length, 39);
    for (const path of paths) {
      assert.ok(path.endsWith('.webp'), path);
      const absolutePath = realpathSync(resolve(root, path));
      assert.ok(absolutePath.startsWith(base), path);
      assert.ok(statSync(absolutePath).size > 64, path);
      const data = readFileSync(absolutePath);
      assert.equal(data.toString('ascii', 0, 4), 'RIFF', path);
      assert.equal(data.toString('ascii', 8, 12), 'WEBP', path);
      hashes.add(createHash('sha256').update(data).digest('hex'));
    }
    assert.equal(hashes.size, 39, `${theme}: every variant, including seven stages, is distinct`);
  }
});

test('static registry resolves the pure catalog and selects each theme', () => {
  const { THEME_NAMES, GAME_VISUAL_PATHS } = loadTs('src/game-visuals/catalog.ts');
  const source = ts.createSourceFile('registry.ts', readFileSync(resolve(root, 'src/game-visuals/registry.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  let requires = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      assert.equal(node.arguments.length, 1);
      assert.ok(ts.isStringLiteral(node.arguments[0]), 'Metro requires a literal asset path');
      requires += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(requires, 117);
  // Asset loading is the external boundary; preserve exact paths as source values.
  const registry = loadTs('src/game-visuals/registry.ts', (path) => {
    assert.ok(path.startsWith('../../assets/pieces/'));
    return path.slice(6);
  });
  for (const theme of THEME_NAMES) {
    assertHangmanStages(registry.GAME_VISUALS[theme].hangman, theme);
    assert.deepEqual(registry.GAME_VISUALS[theme], GAME_VISUAL_PATHS[theme]);
    assert.equal(registry.getGameVisuals(theme), registry.GAME_VISUALS[theme]);
  }
});

test('manifest supplies 117 portable individual records matching the runtime catalog', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1, 'individual manifest schema is required');
  assert.ok(['contract-only', 'generation-batches', 'individual-assets', 'accepted'].includes(manifest.stage));
  assert.equal(manifest.records.length, 117);
  const { GAME_VISUAL_PATHS, REQUIRED_FILES, THEME_NAMES } = loadTs('src/game-visuals/catalog.ts');
  const paths = THEME_NAMES.flatMap((theme) => Object.values(GAME_VISUAL_PATHS[theme])
    .flatMap((family) => Object.values(family).flat()));
  art.validateManifest(manifest, { requiredPaths: paths });
  assert.equal(new Set(manifest.records.map((record) => record.finalPath)).size, 117);
  assert.deepEqual(manifest.records.map((record) => record.finalPath).sort(), paths.sort());
  for (const record of manifest.records) {
    assert.ok(THEME_NAMES.includes(record.theme));
    assert.ok(REQUIRED_FILES[record.family].includes(`${record.role}.webp`));
    assert.equal(record.finalPath, `assets/pieces/${record.theme}/${record.family}/${record.role}.webp`);
    assert.ok(record.prompt?.trim());
    for (const key of ['generatedAt', 'reviewedAt']) {
      if (record.generationPending || record.authorityReferencePending) assert.equal(record[key], null);
      else assert.ok(record[key]?.trim(), key);
    }
    for (const key of ['sourcePath', 'finalPath']) {
      assert.ok(!/^(?:\/|[A-Za-z]:)|\\/.test(record[key]), `${key} is repository-relative`);
      assert.ok(!record[key].split('/').some((part) => ['..', '.', ''].includes(part)));
    }
    assert.ok(Number.isInteger(record.targetSize) && record.targetSize > 0);
    assert.deepEqual(record.visibleBounds, { minFill: 0.72, maxFill: 0.80, safePadding: 0.10 });
    if (record.legacy === true) {
      assert.equal(manifest.stage, 'contract-only', 'legacy records cannot survive Task 2');
      assert.equal(record.sourcePath, record.finalPath, 'legacy source is the committed sprite');
    }
  }
});

test('live manifest accepts all 108 custom sprites and only nine authority-pending quarter slots', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  assert.equal(manifest.stage, 'individual-assets',
    'Task 2 acceptance requires promotion from generation-batches to individual-assets');
  assert.equal(manifest.records.length, 117);
  const custom = manifest.records.filter((record) => record.family !== 'coin-flip');
  const coins = manifest.records.filter((record) => record.family === 'coin-flip');
  assert.equal(custom.length, 108);
  assert.equal(coins.length, 9);
  assert.equal(manifest.records.filter((record) => Object.hasOwn(record, 'legacy')).length, 0);
  assert.equal(manifest.records.filter((record) => Object.hasOwn(record, 'generationPending')).length, 0);
  assert.equal(manifest.records.filter((record) => Object.hasOwn(record, 'authorityReferencePending')).length, 9);
  assert.ok(coins.every((record) => record.authorityReferencePending === true));
  assert.ok(custom.every((record) => !Object.hasOwn(record, 'authorityReferencePending')));
  assert.ok(custom.every((record) => record.generatedAt && Number.isFinite(Date.parse(record.generatedAt))));
  assert.ok(custom.every((record) => record.reviewedAt && Number.isFinite(Date.parse(record.reviewedAt))));
  assert.equal(new Set(custom.map((record) => record.sourcePath)).size, 108);
  assert.equal(new Set(custom.map((record) => record.finalPath)).size, 108);
  for (const record of custom) {
    const identity = `${record.theme}/${record.family}/${record.role}`;
    assert.equal(record.sourcePath, `docs/design/source-art/${identity}.png`);
    assert.equal(record.finalPath, `assets/pieces/${identity}.webp`);
    assert.ok(existsSync(resolve(root, record.sourcePath)), `${identity}: accepted source must exist`);
    assert.ok(existsSync(resolve(root, record.finalPath)), `${identity}: accepted final must exist`);
    assert.match(record.expectedColor, /^#[\dA-F]{6}$/i, `${identity}: exact semantic color is required`);
    requireHelper('validateProductionPrompt')(record);
    if (record.family === 'hangman') {
      assert.equal(record.generator, `scripts/generate-${record.theme}-hangman.mjs`, `${identity}: generator provenance`);
    } else assert.equal(record.generator, undefined, `${identity}: only Hangman uses deterministic generator provenance`);
  }
  art.validateManifest(manifest);
});

test('manifest stages reject legacy after migration and pending coins at final acceptance', () => {
  const validate = requireHelper('validateManifest');
  const legacy = individualRecord({ legacy: true, sourcePath: 'assets/pieces/modern/tic-tac-toe/x.webp' });
  assert.doesNotThrow(() => validate(manifestFixture(legacy, 'contract-only')));
  for (const stage of ['individual-assets', 'accepted']) {
    assert.throws(() => validate(manifestFixture(legacy, stage)), /legacy/);
  }
  assert.throws(() => validate(manifestFixture(individualRecord({ legacy: false }))), /legacy/);
  const coin = individualRecord({ family: 'coin-flip', role: 'heads', authorityReferencePending: true, generatedAt: null, reviewedAt: null,
    sourcePath: 'assets/pieces/modern/coin-flip/heads.webp', finalPath: 'assets/pieces/modern/coin-flip/heads.webp' });
  assert.doesNotThrow(() => validate(manifestFixture(coin)));
  assert.throws(() => validate(manifestFixture(coin, 'accepted')), /pending/i);
  assert.throws(() => validate(manifestFixture(individualRecord({ authorityReferencePending: true, generatedAt: null, reviewedAt: null }))), /coin-flip/);
});

test('manifest rejects malformed records, duplicate identities, missing catalog paths, and weakened bounds', () => {
  const validate = requireHelper('validateManifest');
  const record = individualRecord();
  for (const sourcePath of ['/tmp/art.png', 'C:/art.png', '../art.png', 'docs/../art.png', 'docs\\art.png', './art.png']) {
    assert.throws(() => validate(manifestFixture({ ...record, sourcePath })), /relative|path/i);
  }
  for (const overrides of [{ theme: 'unknown' }, { role: '' }, { targetSize: 0 }, { targetSize: 3.5 },
    { generatedAt: 'yesterday' }, { reviewedAt: '' }, { prompt: '' }, { path: 'old-sheet.png' }, { cols: 2 },
    { visibleBounds: { ...visibleBounds, minFill: 0.70 } }, { visibleBounds: { ...visibleBounds, maxFill: 0.82 } },
    { visibleBounds: { ...visibleBounds, safePadding: 0.01 } }, { sourcePath: record.finalPath }]) {
    assert.throws(() => validate(manifestFixture({ ...record, ...overrides })));
  }
  assert.throws(() => validate({ ...manifestFixture(), records: [record, { ...record }] }), /duplicate/i);
  assert.throws(() => validate(manifestFixture(), { requiredPaths: [record.finalPath, 'missing.webp'] }), /catalog|coverage/i);
  assert.throws(() => validate({ ...manifestFixture(), stage: 'anything' }), /stage/i);
});

test('manifest rejects an output path used by another registered source', () => {
  const x = individualRecord();
  const o = individualRecord({ role: 'o', sourcePath: x.finalPath,
    finalPath: 'assets/pieces/modern/tic-tac-toe/o.webp' });
  assert.throws(() => art.validateManifest({ schemaVersion: 1, stage: 'accepted', records: [x, o] }), /source|collision/i);
});

test('decoded alpha metrics measure visible bounds, padding, and dominant components', async () => {
  const metrics = await requireHelper('readImageMetrics')(await fixture());
  assert.equal(metrics.width, 100); assert.equal(metrics.height, 100); assert.equal(metrics.hasAlpha, true);
  assert.deepEqual(metrics.bounds, { left: 12, top: 12, width: 76, height: 76 });
  assert.deepEqual(metrics.padding, { left: 12, top: 12, right: 12, bottom: 12 });
  assert.equal(metrics.visibleFill, 0.76); assert.equal(metrics.visiblePixels, 5776);
  assert.equal(metrics.transparentCorners, true); assert.equal(metrics.edgeTouching, false);
  assert.equal(metrics.components.meaningfulCount, 1); assert.equal(metrics.components.largestFraction, 1);
  assert.doesNotThrow(() => requireHelper('assertImageMetrics')(metrics, { targetSize: 100, visibleBounds }));
});

test('edge-touching synthetic silhouettes are rejected, including faint alpha edges', async () => {
  const read = requireHelper('readImageMetrics'); const validate = requireHelper('assertImageMetrics');
  for (const alpha of [255, 1]) {
    const image = await fixture({ rectangles: [{ left: 0, top: 12, width: 76, height: 76, alpha }] });
    const metrics = await read(image);
    assert.throws(() => validate(metrics, { visibleBounds }), /edge/i);
  }
});

test('image validation rejects missing alpha, opaque corners, empty art, unsafe padding, wrong fill and extra objects', async () => {
  const read = requireHelper('readImageMetrics'); const validate = requireHelper('assertImageMetrics');
  const cases = [
    [{ alpha: false }, /alpha/i],
    [{ rectangles: [{ left: 0, top: 0, width: 100, height: 100 }] }, /corner|edge/i],
    [{ rectangles: [] }, /empty|visible/i],
    [{ height: 120 }, /square/i],
    [{ rectangles: [{ left: 2, top: 12, width: 76, height: 76 }] }, /padding/i],
    [{ rectangles: [{ left: 25, top: 25, width: 50, height: 50 }] }, /fill/i],
    [{ rectangles: [{ left: 5, top: 5, width: 90, height: 90 }] }, /padding|fill/i],
    [{ rectangles: [{ left: 12, top: 12, width: 30, height: 76 }, { left: 58, top: 12, width: 30, height: 76 }] }, /component|object/i],
  ];
  for (const [options, pattern] of cases) {
    const metrics = await read(await fixture(options));
    assert.throws(() => validate(metrics, { visibleBounds }), pattern);
  }
  const metrics = await read(await fixture());
  assert.throws(() => validate(metrics, { targetSize: 96, visibleBounds }), /dimension/i);
});

test('normalization centers visible pixels, avoids upscaling, preserves sources, and deterministically writes only its final path', async (t) => {
  const normalize = requireHelper('normalizeGameArtAsset');
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-contract-'));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const record = individualRecord(); const source = resolve(temporaryRoot, record.sourcePath);
  mkdirSync(dirname(source), { recursive: true });
  const input = await fixture({ rectangles: [{ left: 10, top: 12, width: 76, height: 76 }] });
  writeFileSync(source, input);
  const first = await normalize(record, { root: temporaryRoot });
  const second = await normalize(record, { root: temporaryRoot });
  assert.deepEqual(first.data, second.data);
  assert.deepEqual(readFileSync(source), input);
  assert.deepEqual(readFileSync(resolve(temporaryRoot, record.finalPath)), first.data);
  assert.deepEqual(readdirSync(dirname(resolve(temporaryRoot, record.finalPath))), ['x.webp']);
  const metrics = await requireHelper('readImageMetrics')(first.data);
  assert.equal(metrics.width, 96); assert.equal(metrics.height, 96);
  assert.ok(Math.abs(metrics.padding.left - metrics.padding.right) <= 1);
  assert.ok(Math.abs(metrics.padding.top - metrics.padding.bottom) <= 1);
  requireHelper('assertImageMetrics')(metrics, record);
  await assert.rejects(normalize({ ...record, targetSize: 200 }, { root: temporaryRoot }), /upscal|fill/i);
  await assert.rejects(normalize({ ...record, legacy: true }, { root: temporaryRoot }), /legacy/i);
  await assert.rejects(normalize({ ...record, authorityReferencePending: true }, { root: temporaryRoot }), /pending/i);
  writeFileSync(source, await fixture({ rectangles: [{ left: 0, top: 12, width: 76, height: 76 }] }));
  await assert.rejects(normalize(record, { root: temporaryRoot }), /edge/i);
  assert.deepEqual(readFileSync(resolve(temporaryRoot, record.finalPath)), first.data, 'invalid art must not overwrite accepted output');
});

test('source normalization removes detached faint residue and safely scales oversized art', async (t) => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-residue-'));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const record = individualRecord(); const source = resolve(temporaryRoot, record.sourcePath);
  mkdirSync(dirname(source), { recursive: true });
  const input = await fixture({ rectangles: [
    { left: 3, top: 3, width: 94, height: 94, alpha: 6 },
    { left: 4, top: 4, width: 92, height: 92 },
    { left: 0, top: 0, width: 1, height: 1, alpha: 12 },
  ] });
  writeFileSync(source, input);
  const first = await art.normalizeGameArtAsset(record, { root: temporaryRoot });
  const second = await art.normalizeGameArtAsset(record, { root: temporaryRoot });
  assert.deepEqual(first.data, second.data);
  assert.deepEqual(readFileSync(source), input, 'the original source must remain byte-identical');
  art.assertImageMetrics(first.metrics, record);
  assert.equal(first.metrics.edgeTouching, false);
  assert.ok(first.metrics.visibleFill >= 0.72 && first.metrics.visibleFill <= 0.80);
});

test('source preparation preserves connected antialiasing and removes only detached sub-5-percent residue', async () => {
  const input = await fixture({ rectangles: [
    { left: 11, top: 11, width: 78, height: 78, alpha: 6 },
    { left: 12, top: 12, width: 76, height: 76 },
    { left: 0, top: 0, width: 1, height: 1, alpha: 12 },
  ] });
  const prepared = await requireHelper('prepareGameArtSource')(input);
  const pixels = await sharp(prepared.input).ensureAlpha().raw().toBuffer();
  assert.equal(pixels[3], 0);
  assert.equal(pixels[(11 * 100 + 11) * 4 + 3], 6);
  assert.equal(pixels[(12 * 100 + 12) * 4 + 3], 255);
  assert.deepEqual(prepared.metrics.bounds, { left: 11, top: 11, width: 78, height: 78 });
});

test('source normalization rejects meaningful edge content, extra objects, and upscaling', async (t) => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-source-safety-'));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const record = individualRecord(); const source = resolve(temporaryRoot, record.sourcePath);
  mkdirSync(dirname(source), { recursive: true });
  const cases = [
    [[{ left: 0, top: 4, width: 92, height: 92, alpha: 13 }], /edge/i],
    [[{ left: 4, top: 4, width: 70, height: 90 }, { left: 80, top: 4, width: 15, height: 15 }], /component|object/i],
    [[{ left: 40, top: 40, width: 20, height: 20 }], /upscal/i],
  ];
  for (const [rectangles, error] of cases) {
    writeFileSync(source, await fixture({ rectangles }));
    await assert.rejects(art.normalizeGameArtAsset(record, { root: temporaryRoot }), error);
    assert.equal(existsSync(resolve(temporaryRoot, record.finalPath)), false);
  }
});

test('normalization rejects a repository-relative symlink that escapes the project', async (t) => {
  const normalize = requireHelper('normalizeGameArtAsset');
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-symlink-'));
  const outside = mkdtempSync(resolve(tmpdir(), 'game-art-outside-'));
  t.after(() => { rmSync(temporaryRoot, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); });
  writeFileSync(resolve(outside, 'x.png'), await fixture());
  symlinkSync(outside, resolve(temporaryRoot, 'escape'));
  await assert.rejects(normalize(individualRecord({ sourcePath: 'escape/x.png' }), { root: temporaryRoot }), /outside|escape/i);
});

test('normalization cannot overwrite its source through an output alias or escape through a dangling link', async (t) => {
  const normalize = requireHelper('normalizeGameArtAsset');
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-output-link-'));
  const outside = mkdtempSync(resolve(tmpdir(), 'game-art-output-outside-'));
  t.after(() => { rmSync(temporaryRoot, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); });
  const record = individualRecord(); const source = resolve(temporaryRoot, record.sourcePath);
  const final = resolve(temporaryRoot, record.finalPath); const input = await fixture();
  mkdirSync(dirname(source), { recursive: true }); mkdirSync(dirname(final), { recursive: true });
  writeFileSync(source, input);
  symlinkSync(source, final);
  await assert.rejects(normalize(record, { root: temporaryRoot }), /source|symlink|symbolic/i);
  assert.deepEqual(readFileSync(source), input);
  rmSync(final);
  linkSync(source, final);
  await assert.rejects(normalize(record, { root: temporaryRoot }), /source|alias/i);
  assert.deepEqual(readFileSync(source), input);
  rmSync(final);
  symlinkSync(resolve(outside, 'missing.webp'), final);
  await assert.rejects(normalize(record, { root: temporaryRoot }), /outside|escape|symlink|symbolic/i);
  assert.equal(existsSync(resolve(outside, 'missing.webp')), false);
});

test('the executable normalizer validates all selected sources before writing and writes only the exact selected asset', async (t) => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-cli-'));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  mkdirSync(resolve(temporaryRoot, 'scripts'));
  for (const filename of ['normalize-game-art.mjs', 'game-art-lib.mjs']) {
    copyFileSync(resolve(root, 'scripts', filename), resolve(temporaryRoot, 'scripts', filename));
  }
  symlinkSync(resolve(root, 'node_modules'), resolve(temporaryRoot, 'node_modules'));
  const records = [individualRecord(), individualRecord({ role: 'o',
    sourcePath: 'docs/design/source-art/modern/tic-tac-toe/o.png', finalPath: 'assets/pieces/modern/tic-tac-toe/o.webp' })];
  const manifestPath = resolve(temporaryRoot, 'docs/design/game-art-sources.json');
  for (const record of records) mkdirSync(dirname(resolve(temporaryRoot, record.sourcePath)), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 1, stage: 'individual-assets', records }));
  writeFileSync(resolve(temporaryRoot, records[0].sourcePath), await fixture());
  writeFileSync(resolve(temporaryRoot, records[1].sourcePath), await fixture({ rectangles: [{ left: 0, top: 12, width: 76, height: 76 }] }));
  const invoke = (...args) => spawnSync(process.execPath, ['scripts/normalize-game-art.mjs', ...args], { cwd: temporaryRoot, encoding: 'utf8' });
  const invalid = invoke('--all');
  assert.equal(invalid.status, 1); assert.match(invalid.stderr, /edge/i);
  assert.equal(existsSync(resolve(temporaryRoot, records[0].finalPath)), false);
  const selected = invoke('--asset', 'modern/tic-tac-toe/x');
  assert.equal(selected.status, 0, selected.stderr);
  assert.equal(existsSync(resolve(temporaryRoot, records[0].finalPath)), true);
  assert.equal(existsSync(resolve(temporaryRoot, records[1].finalPath)), false);
  const before = readFileSync(resolve(temporaryRoot, records[0].finalPath));
  assert.equal(invoke('--asset', 'modern/tic-tac-toe/x').status, 0);
  assert.deepEqual(readFileSync(resolve(temporaryRoot, records[0].finalPath)), before);
});

test('cross-record source bytes survive both all-asset and single-asset CLI selections, including filesystem aliases', async (t) => {
  for (const kind of ['path', 'symlink', 'hardlink', 'relative-link']) {
    for (const selection of ['all', 'single']) {
      await t.test(`${kind} collision, ${selection} selection`, async (child) => {
        const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-cross-record-'));
        child.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
        mkdirSync(resolve(temporaryRoot, 'scripts'));
        for (const filename of ['normalize-game-art.mjs', 'game-art-lib.mjs']) {
          copyFileSync(resolve(root, 'scripts', filename), resolve(temporaryRoot, 'scripts', filename));
        }
        symlinkSync(resolve(root, 'node_modules'), resolve(temporaryRoot, 'node_modules'));
        const x = individualRecord();
        const o = individualRecord({ role: 'o',
          sourcePath: kind === 'path' ? x.finalPath : kind === 'relative-link'
            ? 'docs/design/linked-source/o.png' : 'docs/design/source-art/modern/tic-tac-toe/o.png',
          finalPath: 'assets/pieces/modern/tic-tac-toe/o.webp' });
        const xSource = resolve(temporaryRoot, x.sourcePath); const oSource = resolve(temporaryRoot, o.sourcePath);
        const xFinal = resolve(temporaryRoot, x.finalPath);
        mkdirSync(dirname(xSource), { recursive: true }); mkdirSync(dirname(xFinal), { recursive: true });
        const input = await fixture();
        const other = await fixture({ rectangles: [{ left: 12, top: 12, width: 76, height: 76, color: [210, 50, 80] }] });
        writeFileSync(xSource, input); writeFileSync(xFinal, other);
        if (kind === 'symlink') symlinkSync(xFinal, oSource);
        if (kind === 'hardlink') linkSync(xFinal, oSource);
        if (kind === 'relative-link') {
          const directory = resolve(temporaryRoot, 'assets/pieces/modern/alias-source');
          mkdirSync(directory);
          symlinkSync(directory, resolve(temporaryRoot, 'docs/design/linked-source'));
          symlinkSync('../tic-tac-toe/x.webp', resolve(directory, 'o.png'));
        }
        writeFileSync(resolve(temporaryRoot, 'docs/design/game-art-sources.json'),
          JSON.stringify({ schemaVersion: 1, stage: 'accepted', records: [x, o] }));
        const args = selection === 'all' ? ['--all'] : ['--asset', 'modern/tic-tac-toe/x'];
        const cli = spawnSync(process.execPath, ['scripts/normalize-game-art.mjs', ...args],
          { cwd: temporaryRoot, encoding: 'utf8' });
        assert.equal(readFileSync(oSource).equals(other), true, 'The registered O source must remain byte-identical');
        assert.deepEqual(readFileSync(xSource), input);
        assert.equal(existsSync(resolve(temporaryRoot, o.finalPath)), false, 'No final may be created before collision rejection');
        assert.equal(cli.status, 1, cli.stderr);
        assert.match(cli.stderr, /source|collision|alias/i);
      });
    }
  }
});

test('direct normalization protects every source registered in the project manifest', async (t) => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-direct-cross-record-'));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const x = individualRecord();
  const o = individualRecord({ role: 'o', sourcePath: 'docs/design/source-art/modern/tic-tac-toe/o.png',
    finalPath: 'assets/pieces/modern/tic-tac-toe/o.webp' });
  const xSource = resolve(temporaryRoot, x.sourcePath); const xFinal = resolve(temporaryRoot, x.finalPath);
  const oSource = resolve(temporaryRoot, o.sourcePath);
  mkdirSync(dirname(xSource), { recursive: true }); mkdirSync(dirname(xFinal), { recursive: true });
  const input = await fixture(); const other = await fixture({ rectangles: [{ left: 12, top: 12, width: 76, height: 76, color: [210, 50, 80] }] });
  writeFileSync(xSource, input); writeFileSync(xFinal, other); linkSync(xFinal, oSource);
  writeFileSync(resolve(temporaryRoot, 'docs/design/game-art-sources.json'),
    JSON.stringify({ schemaVersion: 1, stage: 'accepted', records: [x, o] }));
  await art.normalizeGameArtAsset(x, { root: temporaryRoot, write: false });
  assert.equal(readFileSync(oSource).equals(other), true, 'Dry-run preflight must not write source bytes');
  await assert.rejects(art.normalizeGameArtAsset(x, { root: temporaryRoot }), /source|collision|alias/i);
  assert.equal(readFileSync(oSource).equals(other), true, 'Direct writes must preserve every registered source');
});

test('registered source aliases cannot be created by writing a previously missing selected output', async (t) => {
  for (const kind of ['file-symlink', 'directory-symlink']) {
    await t.test(kind, async (child) => {
      const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'game-art-future-alias-'));
      child.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
      mkdirSync(resolve(temporaryRoot, 'scripts'));
      for (const filename of ['normalize-game-art.mjs', 'game-art-lib.mjs']) {
        copyFileSync(resolve(root, 'scripts', filename), resolve(temporaryRoot, 'scripts', filename));
      }
      symlinkSync(resolve(root, 'node_modules'), resolve(temporaryRoot, 'node_modules'));
      const x = individualRecord();
      const o = individualRecord({ role: 'o',
        sourcePath: kind === 'file-symlink' ? 'docs/design/source-art/modern/tic-tac-toe/o.png' : 'docs/design/linked-output/x.webp',
        finalPath: 'assets/pieces/modern/tic-tac-toe/o.webp' });
      const source = resolve(temporaryRoot, x.sourcePath); const final = resolve(temporaryRoot, x.finalPath);
      mkdirSync(dirname(source), { recursive: true }); mkdirSync(dirname(final), { recursive: true });
      const input = await fixture(); writeFileSync(source, input);
      if (kind === 'file-symlink') symlinkSync(final, resolve(temporaryRoot, o.sourcePath));
      else symlinkSync(dirname(final), resolve(temporaryRoot, 'docs/design/linked-output'));
      writeFileSync(resolve(temporaryRoot, 'docs/design/game-art-sources.json'),
        JSON.stringify({ schemaVersion: 1, stage: 'accepted', records: [x, o] }));
      const cli = spawnSync(process.execPath, ['scripts/normalize-game-art.mjs', '--asset', 'modern/tic-tac-toe/x'],
        { cwd: temporaryRoot, encoding: 'utf8' });
      assert.equal(readFileSync(source).equals(input), true);
      assert.equal(existsSync(final), false, 'An output must not create another registered source through an alias');
      assert.equal(existsSync(resolve(temporaryRoot, o.sourcePath)), false);
      assert.equal(cli.status, 1); assert.match(cli.stderr, /source|collision|alias/i);
    });
  }
});

test('normalizer selectors choose all, family, or an exact theme/family/role and reject ambiguous arguments', () => {
  assert.equal(typeof normalizer.selectRecords, 'function', 'normalizer must expose deterministic selectors');
  const records = [individualRecord(), individualRecord({ theme: 'retro' }), individualRecord({ family: 'dice', role: 'd4' })];
  const manifest = { schemaVersion: 1, stage: 'individual-assets', records };
  assert.deepEqual(normalizer.selectRecords(manifest, ['--all']), records);
  assert.deepEqual(normalizer.selectRecords(manifest, ['--family', 'tic-tac-toe']), records.slice(0, 2));
  assert.deepEqual(normalizer.selectRecords(manifest, ['--asset', 'modern/tic-tac-toe/x']), [records[0]]);
  for (const args of [[], ['tic-tac-toe'], ['--family'], ['--asset', 'x'], ['--family', 'missing'], ['--all', '--family', 'dice']]) {
    assert.throws(() => normalizer.selectRecords(manifest, args), /usage|matching|selector/i);
  }
  const cli = spawnSync(process.execPath, ['scripts/normalize-game-art.mjs', '--unknown'], { cwd: root, encoding: 'utf8' });
  assert.equal(cli.status, 1); assert.match(cli.stderr, /usage/i);
});

test('contact sheets preserve input order and display sprites on deterministic light and dark backgrounds', async () => {
  const create = requireHelper('createContactSheet');
  const input = await fixture();
  const other = await fixture({ rectangles: [{ left: 12, top: 12, width: 76, height: 76, color: [210, 50, 80] }] });
  for (const background of ['#f5f5f5', '#101020']) {
    const data = await create([input, other], { columns: 2, cellSize: 100, background });
    assert.deepEqual(data, await create([input, other], { columns: 2, cellSize: 100, background }));
    const { data: pixels, info } = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const raw = await create([input, other], { columns: 2, cellSize: 100, background, format: 'raw' });
    assert.equal(raw.length, 200 * 100 * 4, 'Raw contact sheet must return unpacked RGBA pixels');
    assert.deepEqual(raw, pixels, 'Raw contact sheet pixels must equal lossless WebP decode');
    assert.equal(info.width, 200); assert.equal(info.height, 100);
    const color = background === '#f5f5f5' ? [245, 245, 245, 255] : [16, 16, 32, 255];
    assert.deepEqual([...pixels.subarray(0, 4)], color);
    assert.deepEqual([...pixels.subarray((50 * 200 + 50) * 4, (50 * 200 + 50) * 4 + 4)], [20, 100, 200, 255]);
    assert.deepEqual([...pixels.subarray((50 * 200 + 150) * 4, (50 * 200 + 150) * 4 + 4)], [210, 50, 80, 255]);
  }
});

test('registered production art stays within the 2 MiB total and 64 KiB per-file offline budget', () => {
  assert.equal(art.MAX_GAME_ART_BYTES, 2 * 1024 * 1024);
  assert.equal(art.MAX_GAME_ART_FILE_BYTES, 64 * 1024);
  const { GAME_VISUAL_PATHS, THEME_NAMES } = loadTs('src/game-visuals/catalog.ts');
  const paths = THEME_NAMES.flatMap((theme) => Object.values(GAME_VISUAL_PATHS[theme]).flatMap((family) => Object.values(family).flat()));
  let bytes = 0;
  for (const path of paths) {
    const size = statSync(resolve(root, path)).size;
    assert.ok(size <= art.MAX_GAME_ART_FILE_BYTES, `${path}: ${size} bytes exceeds per-file budget`);
    bytes += size;
  }
  assert.ok(bytes <= art.MAX_GAME_ART_BYTES, `${bytes} bytes exceeds total game-art budget`);
});

test('all final sprites decode as square RGBA with consistent family dimensions; migrated art meets strict bounds', async () => {
  const read = requireHelper('readImageMetrics'); const validate = requireHelper('assertImageMetrics');
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  const familySizes = new Map();
  for (const record of manifest.records) {
    const metrics = await read(resolve(root, record.finalPath));
    assert.equal(metrics.width, record.targetSize, record.finalPath);
    assert.equal(metrics.height, record.targetSize, record.finalPath);
    assert.equal(metrics.hasAlpha, true, record.finalPath);
    assert.equal(metrics.transparentCorners, true, record.finalPath);
    assert.equal(metrics.edgeTouching, false, record.finalPath);
    const key = record.family;
    if (familySizes.has(key)) assert.equal(record.targetSize, familySizes.get(key), key);
    familySizes.set(key, record.targetSize);
    // During generation batches, old finals stay in place until the individual source is inspected.
    if (record.legacy !== true && record.authorityReferencePending !== true && record.generationPending !== true) validate(metrics, record);
  }
});

test('accepted token, checker, marble, pawn, seed, and die families retain normalized framing and camera evidence', async () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  const groups = [
    { name: 'token', camera: 'top-down', records: (record) => ['tic-tac-toe', 'connect-four'].includes(record.family),
      aspect: [0.95, 1.05] },
    { name: 'checker', camera: 'top-down', records: (record) => record.family === 'checkers' && record.role !== 'king-crown',
      aspect: [0.98, 1.02] },
    { name: 'marble', camera: 'top-down', records: (record) => record.family === 'chinese-checkers',
      aspect: [0.97, 1.03] },
    { name: 'pawn', camera: 'front three-quarter', records: (record) => record.family === 'trouble',
      aspect: [0.50, 0.70] },
    { name: 'seed', camera: 'top-down', records: (record) => record.family === 'mancala' },
    { name: 'die', camera: 'front three-quarter', records: (record) => record.family === 'dice' },
  ];
  for (const group of groups) {
    const records = manifest.records.filter(group.records);
    assert.ok(records.length >= 6, `${group.name}: complete three-theme family evidence is required`);
    const fills = [];
    for (const record of records) {
      const identity = `${record.theme}/${record.family}/${record.role}`;
      assert.match(record.prompt, new RegExp(`Camera: ${group.camera};`, 'i'), `${identity}: camera contract`);
      const metrics = await art.readImageMetrics(resolve(root, record.finalPath));
      art.assertImageMetrics(metrics, record);
      const centerX = metrics.bounds.left + (metrics.bounds.width - 1) / 2;
      const centerY = metrics.bounds.top + (metrics.bounds.height - 1) / 2;
      const canvasCenter = (metrics.width - 1) / 2;
      assert.ok(Math.abs(centerX - canvasCenter) <= 0.5, `${identity}: horizontally normalized`);
      assert.ok(Math.abs(centerY - canvasCenter) <= 0.5, `${identity}: vertically normalized`);
      fills.push(metrics.visibleFill);
      if (group.aspect) {
        const aspect = metrics.bounds.width / metrics.bounds.height;
        assert.ok(aspect >= group.aspect[0] && aspect <= group.aspect[1],
          `${identity}: silhouette orientation ${aspect.toFixed(3)} must fit ${group.name} camera evidence`);
      }
    }
    assert.ok(Math.max(...fills) - Math.min(...fills) <= 0.005,
      `${group.name}: normalized longest-bound fill must remain consistent across themes`);
  }
});

test('all 48 retained batch QA sheets reproduce pixel-for-pixel from accepted finals', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  const batches = [
    { theme: 'modern', families: ['tic-tac-toe', 'connect-four', 'checkers'], columns: 4, full: 256, phone: 64,
      files: { light: 'modern-tokens-discs-light.webp', dark: 'modern-tokens-discs-dark.webp',
        'phone-light': 'modern-tokens-discs-phone-light.webp', 'phone-dark': 'modern-tokens-discs-phone-dark.webp' } },
    { theme: 'retro', families: ['tic-tac-toe', 'connect-four', 'checkers'], columns: 4, full: 256, phone: 64,
      files: { light: 'retro-tokens-discs-full-light.webp', dark: 'retro-tokens-discs-full-dark.webp',
        'phone-light': 'retro-tokens-discs-phone-light.webp', 'phone-dark': 'retro-tokens-discs-phone-dark.webp' } },
    { theme: 'arcade', families: ['tic-tac-toe', 'connect-four', 'checkers'], columns: 4, full: 256, phone: 64,
      files: { light: 'arcade-tokens-discs-full-light.webp', dark: 'arcade-tokens-discs-full-dark.webp',
        'phone-light': 'arcade-tokens-discs-phone-light.webp', 'phone-dark': 'arcade-tokens-discs-phone-dark.webp' } },
    { theme: 'modern', families: ['chinese-checkers', 'mancala'], columns: 6, full: 128, phone: 32,
      files: { light: 'modern-marbles-seeds-light.webp', dark: 'modern-marbles-seeds-dark.webp',
        'phone-light': 'modern-marbles-seeds-phone-light.webp', 'phone-dark': 'modern-marbles-seeds-phone-dark.webp' } },
    ...['retro', 'arcade'].map((theme) => ({ theme, families: ['chinese-checkers', 'mancala'], columns: 6, full: 128, phone: 32,
      files: { light: `${theme}-marbles-stones-full-light.webp`, dark: `${theme}-marbles-stones-full-dark.webp`,
        'phone-light': `${theme}-marbles-stones-phone-light.webp`, 'phone-dark': `${theme}-marbles-stones-phone-dark.webp` } })),
    ...['modern', 'retro', 'arcade'].map((theme) => ({ theme, families: ['trouble', 'dice'], columns: 5, full: 256, phone: 64,
      files: { light: `${theme}-pawns-dice-full-light.webp`, dark: `${theme}-pawns-dice-full-dark.webp`,
        'phone-light': `${theme}-pawns-dice-phone-light.webp`, 'phone-dark': `${theme}-pawns-dice-phone-dark.webp` } })),
    ...['modern', 'retro', 'arcade'].map((theme) => ({ theme, families: ['hangman'], columns: 4, full: 384, phone: 160,
      backgrounds: theme === 'retro' ? { light: '#f5f0e6', dark: '#17120d' } : undefined,
      files: { light: `${theme}-hangman-full-light.webp`, dark: `${theme}-hangman-full-dark.webp`,
        'phone-light': `${theme}-hangman-phone-light.webp`, 'phone-dark': `${theme}-hangman-phone-dark.webp` } })),
  ];
  const reproduceSheet = String.raw`
    import assert from 'node:assert/strict';
    import { existsSync, readFileSync } from 'node:fs';
    import { resolve } from 'node:path';
    import sharp from 'sharp';
    import * as art from './scripts/game-art-lib.mjs';

    sharp.concurrency(1);
    const root = process.cwd();
    const { batch, mode, filename } = JSON.parse(process.env.GAME_ART_QA_SHEET);
    const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
    const records = manifest.records.filter((record) =>
      record.theme === batch.theme && batch.families.includes(record.family));
    const phone = mode.startsWith('phone-');
    const dark = mode.endsWith('dark');
    const fresh = await art.createContactSheet(records, {
      root,
      columns: phone && batch.families.includes('checkers') ? 7 : batch.columns,
      cellSize: phone ? batch.phone : batch.full,
      background: dark ? (batch.backgrounds?.dark ?? '#101020') : (batch.backgrounds?.light ?? '#f5f5f5'),
      format: 'raw',
    });
    const path = resolve(root, 'docs/design/qa', filename);
    assert.ok(existsSync(path), filename + ': retained QA sheet must exist');
    const expected = await sharp(path).ensureAlpha().raw().toBuffer();
    assert.equal(fresh.equals(expected), true, filename + ': pixel-exact deterministic reproduction');
    process.stdout.write(JSON.stringify(filename));
  `;
  const comparisons = [];
  for (const batch of batches) {
    for (const [mode, filename] of Object.entries(batch.files)) {
      const result = spawnSync(process.execPath, ['--input-type=module', '--eval', reproduceSheet], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, VIPS_CONCURRENCY: '1', GAME_ART_QA_SHEET: JSON.stringify({ batch, mode, filename }) },
        maxBuffer: 1024 * 1024,
      });
      assert.equal(result.status, 0,
        `${filename}: isolated QA reproduction failed (signal ${result.signal || 'none'})\n${result.stderr || result.stdout}`);
      comparisons.push(JSON.parse(result.stdout));
    }
  }
  assert.equal(batches.length, 12);
  assert.equal(comparisons.length, 48);
  assert.equal(new Set(comparisons).size, 48);
});

test('generation batches retain 108 individual prompts and nine quarter slots through honest batch progress', () => {
  const m = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  assert.ok(['generation-batches', 'individual-assets', 'accepted'].includes(m.stage));
  assert.equal(m.records.filter((r) => r.family !== 'coin-flip').length, 108);
  assert.equal(m.records.filter((r) => r.family === 'coin-flip').length, 9);
  art.validateManifest(m);
  const counts = { 'tic-tac-toe': 2, 'connect-four': 2, checkers: 3, 'chinese-checkers': 6, mancala: 6, trouble: 4, dice: 6, hangman: 7, 'coin-flip': 3 };
  for (const theme of ['modern', 'retro', 'arcade']) for (const [family, count] of Object.entries(counts)) {
    assert.equal(m.records.filter((r) => r.theme === theme && r.family === family).length, count);
  }
  assert.equal(new Set(m.records.map((r) => r.sourcePath)).size, 117);
  assert.equal(new Set(m.records.filter((r) => r.family !== 'coin-flip').map((r) => r.prompt)).size, 108);
  for (const r of m.records) {
    assert.equal(r.legacy, undefined);
    if (r.generationPending || r.authorityReferencePending) {
      assert.equal(r.generatedAt, null);
      assert.equal(r.reviewedAt, null);
    } else {
      assert.ok(r.generatedAt && r.reviewedAt, 'Completed batches need real provenance');
    }
    assert.equal(r.sourcePath, `docs/design/source-art/${r.theme}/${r.family}/${r.role}.png`);
    if (r.family !== 'coin-flip') requireHelper('validateProductionPrompt')(r);
  }
});

test('generationPending is restricted to generation batches and rejects fabricated dates or overlapping status', () => {
  const pending = individualRecord({ generationPending: true, generatedAt: null, reviewedAt: null });
  assert.doesNotThrow(() => art.validateManifest(manifestFixture(pending, 'generation-batches')));
  for (const stage of ['contract-only', 'individual-assets', 'accepted']) {
    assert.throws(() => art.validateManifest(manifestFixture(pending, stage)), /generationPending/);
  }
  for (const overrides of [{ generationPending: false }, { generatedAt: '2026-09-27' }, { reviewedAt: '2026-09-27' }, { legacy: true }, { authorityReferencePending: true }]) {
    assert.throws(() => art.validateManifest(manifestFixture({ ...pending, ...overrides }, 'generation-batches')));
  }
  assert.throws(() => art.validateManifest(manifestFixture(individualRecord({ generatedAt: null }))), /generatedAt/);
  assert.throws(() => art.validateManifest(manifestFixture(individualRecord({ reviewedAt: null }))), /reviewedAt/);
});

test('individual source reuse across different outputs is rejected', () => {
  const x = individualRecord();
  const o = individualRecord({ role: 'o', finalPath: 'assets/pieces/modern/tic-tac-toe/o.webp' });
  assert.throws(() => art.validateManifest({ schemaVersion: 1, stage: 'individual-assets', records: [x, o] }), /duplicate.*source/i);
});

test('production prompt validation rejects missing composition, color, multi-object art, marked dice, and unsafe Hangman imagery', () => {
  const validate = requireHelper('validateProductionPrompt');
  const r = individualRecord({ expectedColor: '#DC2626', expectedOwner: 'player1',
    prompt: 'Use case: product-mockup. Theme: Modern molded plastic, polished resin, clear glass. Role: x; owner: player1; color: #DC2626. One tactile X token. Camera: top-down. Square canvas; genuine alpha transparent background; 72–80% target fill; complete silhouette; no text; no watermark; no ground plane.' });
  assert.doesNotThrow(() => validate(r));
  for (const phrase of ['molded plastic', '#DC2626', 'top-down', 'Square', 'genuine alpha', '72–80%', 'complete silhouette', 'no text', 'no watermark', 'no ground plane']) {
    assert.throws(() => validate({ ...r, prompt: r.prompt.replace(phrase, '') }), /prompt/i);
  }
  assert.throws(() => validate({ ...r, prompt: r.prompt + ' sprite sheet' }), /prompt/i);
  assert.throws(() => validate({ ...r, family: 'dice', prompt: r.prompt + ' d20 numbered faces' }), /blank|prompt/i);
  assert.throws(() => validate({ ...r, family: 'hangman', prompt: r.prompt + ' friendly assembly with a noose' }), /prompt/i);
});

async function hangmanFixtures(temporaryRoot) {
  const records = [];
  for (let stage = 0; stage < 7; stage++) {
    const r = individualRecord({ family: 'hangman', role: `stage-${stage}`,
      sourcePath: `docs/design/source-art/modern/hangman/stage-${stage}.png`,
      finalPath: `assets/pieces/modern/hangman/stage-${stage}.webp` });
    const path = resolve(temporaryRoot, r.sourcePath);
    mkdirSync(dirname(path), { recursive: true });
    const height = 8 + stage * 10;
    writeFileSync(path, await fixture({ rectangles: [{ left: 12, top: 88 - height, width: 76, height }] }));
    records.push(r);
  }
  return records;
}

test('Hangman group normalization preserves the common base and scale across all seven source bounds', async (t) => {
  const normalize = requireHelper('normalizeHangmanGroup');
  const dir = mkdtempSync(resolve(tmpdir(), 'game-art-hangman-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const records = await hangmanFixtures(dir);
  const sources = records.map((r) => readFileSync(resolve(dir, r.sourcePath)));
  const first = await normalize(records, { root: dir });
  const second = await normalize([...records].reverse(), { root: dir, write: false });
  assert.equal(first.results.length, 7);
  assert.deepEqual(first.transform.sourceBounds, { left: 12, top: 20, width: 76, height: 68 });
  assert.equal(first.transform.scale, 73 / 76);
  assert.deepEqual([...new Set(first.results.map(({ metrics: m }) => m.bounds.top + m.bounds.height))], [85]);
  assert.equal(new Set(first.results.map(({ metrics: m }) => m.bounds.width)).size, 1);
  assert.equal(new Set(first.results.map(({ data }) => createHash('sha256').update(data).digest('hex'))).size, 7);
  for (let stage = 0; stage < 7; stage++) {
    assert.deepEqual(first.results[stage].data, second.results[6 - stage].data);
    assert.deepEqual(readFileSync(resolve(dir, records[stage].sourcePath)), sources[stage]);
    assert.deepEqual(readFileSync(resolve(dir, records[stage].finalPath)), first.results[stage].data);
    art.assertImageMetrics(first.results[stage].metrics, records[stage]);
    if (stage) assert.ok(first.results[stage].metrics.visiblePixels > first.results[stage - 1].metrics.visiblePixels);
  }
  await assert.rejects(art.normalizeGameArtAsset(records[0], { root: dir }), /Hangman.*group/i);
  for (const invalid of [records.slice(1), [...records.slice(0, 6), records[0]], records.map((r, i) => i === 6 ? { ...r, theme: 'retro' } : r)]) {
    await assert.rejects(normalize(invalid, { root: dir }), /seven|stage|theme/i);
  }
  writeFileSync(resolve(dir, records[6].sourcePath), await fixture({ rectangles: [{ left: 12, top: 10, width: 76, height: 76 }] }));
  await assert.rejects(normalize(records, { root: dir }), /base/i);
  assert.deepEqual(readFileSync(resolve(dir, records[0].finalPath)), first.results[0].data);
});

test('exact Hangman CLI selection reads the complete theme but writes only the selected stage', async (t) => {
  const dir = mkdtempSync(resolve(tmpdir(), 'game-art-hangman-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(resolve(dir, 'scripts'));
  for (const name of ['normalize-game-art.mjs', 'game-art-lib.mjs']) copyFileSync(resolve(root, 'scripts', name), resolve(dir, 'scripts', name));
  symlinkSync(resolve(root, 'node_modules'), resolve(dir, 'node_modules'));
  const records = await hangmanFixtures(dir);
  writeFileSync(resolve(dir, 'docs/design/game-art-sources.json'), JSON.stringify({ schemaVersion: 1, stage: 'individual-assets', records }));
  const invoke = () => spawnSync(process.execPath, ['scripts/normalize-game-art.mjs', '--asset', 'modern/hangman/stage-0'], { cwd: dir, encoding: 'utf8' });
  const result = invoke();
  assert.equal(result.status, 0, result.stderr);
  const m = await art.readImageMetrics(resolve(dir, records[0].finalPath));
  assert.equal(m.bounds.top + m.bounds.height, 85);
  assert.deepEqual(readdirSync(dirname(resolve(dir, records[0].finalPath))), ['stage-0.webp']);
  rmSync(resolve(dir, records[6].sourcePath));
  assert.equal(invoke().status, 1, 'A missing stage cannot produce a different group transform');
});

test('source-preservation preflight rejects two source paths that alias one physical image', async (t) => {
  const dir = mkdtempSync(resolve(tmpdir(), 'game-art-source-reuse-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const x = individualRecord();
  const o = individualRecord({ role: 'o', sourcePath: 'docs/design/source-art/modern/tic-tac-toe/o.png',
    finalPath: 'assets/pieces/modern/tic-tac-toe/o.webp' });
  const path = resolve(dir, x.sourcePath);
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, await fixture());
  linkSync(path, resolve(dir, o.sourcePath));
  await assert.rejects(art.assertManifestSourcePreservation({ schemaVersion: 1, stage: 'individual-assets', records: [x, o] },
    { root: dir }), /duplicate.*source|source.*alias/i);
});

test('Hangman production prompts require a shared frame and fixed base without independent centering', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  const records = manifest.records.filter((record) => record.family === 'hangman');
  assert.equal(records.length, 21);
  for (const record of records) {
    const identity = `${record.theme}/${record.role}`;
    assert.doesNotMatch(record.prompt, /composition: one centered object/i, identity);
    assert.match(record.prompt, /composition: shared-frame assembly/i, identity);
    assert.match(record.prompt, /horizontally centered at x=512/i, identity);
    assert.match(record.prompt, /fixed base anchor at y=901/i, identity);
    assert.match(record.prompt, /do not vertically center or independently recenter any stage/i, identity);
  }
});

test('deterministic generator provenance is repository-relative and restricted to completed Hangman records', () => {
  const generator = 'scripts/generate-modern-hangman.mjs';
  const completed = individualRecord({ family: 'hangman', role: 'stage-0',
    sourcePath: 'docs/design/source-art/modern/hangman/stage-0.png',
    finalPath: 'assets/pieces/modern/hangman/stage-0.webp', generator });
  assert.doesNotThrow(() => art.validateManifest(manifestFixture(completed)));
  for (const record of [
    { ...completed, family: 'dice', role: 'd6', sourcePath: 'docs/design/source-art/modern/dice/d6.png',
      finalPath: 'assets/pieces/modern/dice/d6.webp' },
    { ...completed, generationPending: true, generatedAt: null, reviewedAt: null },
    { ...completed, generator: '/tmp/generate-modern-hangman.mjs' },
    { ...completed, generator: '../generate-modern-hangman.mjs' },
  ]) {
    assert.throws(() => art.validateManifest(manifestFixture(record,
      record.generationPending ? 'generation-batches' : 'individual-assets')), /generator|repository-relative|Hangman|completed/i);
  }
});

test('Modern Hangman authoring renders deterministic 1024px alpha sources with the exact fixed platform', async () => {
  const generator = await loadModernHangmanGenerator();
  assert.equal(typeof generator.renderModernHangmanStage, 'function',
    'renderModernHangmanStage must provide deterministic source authoring');
  const first = await generator.renderModernHangmanStage(0);
  const second = await generator.renderModernHangmanStage(0);
  assert.deepEqual(first, second, 'Repeated authoring must produce byte-identical PNGs');
  const metrics = art.assertImageMetrics(await art.readImageMetrics(first), { targetSize: 1024, visibleBounds });
  assert.deepEqual(metrics.bounds, { left: 123, top: 789, width: 778, height: 112 });
  assert.equal(metrics.bounds.top + metrics.bounds.height, 901, 'The fixed platform bottom edge is y=901');
  assert.equal(metrics.components.meaningfulCount, 1);
});

test('Modern Hangman stages add one semantic group at a time while retaining every opaque prior pixel', async () => {
  const generator = await loadModernHangmanGenerator();
  assert.equal(typeof generator.renderModernHangmanStage, 'function',
    'renderModernHangmanStage must provide shared conditional geometry');
  const stages = await Promise.all(Array.from({ length: 7 }, (_, stage) => generator.renderModernHangmanStage(stage)));
  const decoded = await Promise.all(stages.map((input) => sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const hashes = stages.map((input) => createHash('sha256').update(input).digest('hex'));
  assert.equal(new Set(hashes).size, 7, 'Every stage must have distinct source bytes');
  const visible = [];
  for (let stage = 0; stage < decoded.length; stage++) {
    const { data, info } = decoded[stage];
    assert.equal(info.width, 1024); assert.equal(info.height, 1024); assert.equal(info.channels, 4);
    const metrics = art.assertImageMetrics(await art.readImageMetrics(stages[stage]), { targetSize: 1024, visibleBounds });
    assert.equal(metrics.bounds.left, 123); assert.equal(metrics.bounds.width, 778);
    assert.equal(metrics.bounds.top + metrics.bounds.height, 901);
    assert.equal(metrics.components.meaningfulCount, 1);
    visible.push(metrics.visiblePixels);
    if (stage === 0) continue;
    const prior = decoded[stage - 1].data;
    for (let offset = 0; offset < prior.length; offset += 4) {
      if (prior[offset + 3] !== 255) continue;
      assert.deepEqual(data.subarray(offset, offset + 4), prior.subarray(offset, offset + 4),
        `Stage ${stage} must retain every opaque pixel from stage ${stage - 1}`);
    }
  }
  for (let stage = 1; stage < visible.length; stage++) {
    assert.ok(visible[stage] > visible[stage - 1], `Stage ${stage} must add visible geometry`);
  }

  const alphaAt = (stage, x, y) => decoded[stage].data[(y * 1024 + x) * 4 + 3];
  const additions = [
    { stage: 1, point: [220, 500], label: 'posts' },
    { stage: 2, point: [512, 235], label: 'crossbar' },
    { stage: 3, point: [512, 380], label: 'head' },
    { stage: 4, point: [512, 570], label: 'torso' },
    { stage: 5, point: [376, 570], label: 'arms' },
    { stage: 6, point: [456, 748], label: 'feet' },
  ];
  for (const { stage, point: [x, y], label } of additions) {
    assert.equal(alphaAt(stage - 1, x, y), 0, `${label} must not appear before stage ${stage}`);
    assert.ok(alphaAt(stage, x, y) >= 250, `${label} must be unmistakable at stage ${stage}`);
  }
});

test('Modern Hangman 1024px sources normalize together by downscaling with one shared transform', async (t) => {
  const generator = await loadModernHangmanGenerator();
  assert.equal(typeof generator.renderModernHangmanStage, 'function',
    'renderModernHangmanStage must provide group-normalizable sources');
  const dir = mkdtempSync(resolve(tmpdir(), 'modern-hangman-authoring-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const records = [];
  for (let stage = 0; stage < 7; stage++) {
    const record = individualRecord({ family: 'hangman', role: `stage-${stage}`,
      sourcePath: `docs/design/source-art/modern/hangman/stage-${stage}.png`,
      finalPath: `assets/pieces/modern/hangman/stage-${stage}.webp`, targetSize: 384,
      generator: 'scripts/generate-modern-hangman.mjs' });
    const path = resolve(dir, record.sourcePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, await generator.renderModernHangmanStage(stage));
    records.push(record);
  }
  const { results, transform } = await art.normalizeHangmanGroup(records, { root: dir, write: false });
  assert.ok(transform.scale > 0 && transform.scale < 1, 'Production normalization must downscale, never upscale');
  assert.deepEqual(transform.sourceBounds, { left: 123, top: 206, width: 778, height: 695 });
  assert.deepEqual([...new Set(results.map(({ metrics }) => metrics.bounds.top + metrics.bounds.height))], [338]);
  assert.equal(new Set(results.map(({ data }) => createHash('sha256').update(data).digest('hex'))).size, 7);
});

test('Retro Hangman authoring renders deterministic 1024px alpha sources with the exact fixed platform', async () => {
  const generator = await loadRetroHangmanGenerator();
  assert.equal(typeof generator.renderRetroHangmanStage, 'function',
    'renderRetroHangmanStage must provide deterministic Retro source authoring');
  assert.equal(generator.RETRO_HANGMAN_GENERATOR, 'scripts/generate-retro-hangman.mjs');
  const first = await generator.renderRetroHangmanStage(0);
  const second = await generator.renderRetroHangmanStage(0);
  assert.deepEqual(first, second, 'Repeated Retro authoring must produce byte-identical PNGs');
  const metrics = art.assertImageMetrics(await art.readImageMetrics(first), { targetSize: 1024, visibleBounds });
  assert.deepEqual(metrics.bounds, { left: 123, top: 789, width: 778, height: 112 });
  assert.equal(metrics.bounds.top + metrics.bounds.height, 901, 'The fixed platform bottom edge is y=901');
  assert.equal(metrics.components.meaningfulCount, 1);
});

test('Modern and Retro Hangman share exact stage geometry while Retro retains every prior opaque pixel', async () => {
  const modern = await loadModernHangmanGenerator();
  const retro = await loadRetroHangmanGenerator();
  assert.equal(typeof retro.renderRetroHangmanStage, 'function',
    'Retro Hangman must extend the deterministic shared geometry model');
  const modernStages = await Promise.all(Array.from({ length: 7 }, (_, stage) => modern.renderModernHangmanStage(stage)));
  const retroStages = await Promise.all(Array.from({ length: 7 }, (_, stage) => retro.renderRetroHangmanStage(stage)));
  const decode = (input) => sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const modernDecoded = await Promise.all(modernStages.map(decode));
  const retroDecoded = await Promise.all(retroStages.map(decode));
  assert.equal(new Set(retroStages.map((input) => createHash('sha256').update(input).digest('hex'))).size, 7,
    'Every Retro stage must have distinct source bytes');
  const visible = [];
  for (let stage = 0; stage < 7; stage++) {
    const current = retroDecoded[stage];
    assert.deepEqual(current.info, modernDecoded[stage].info, `Stage ${stage} must use the shared source canvas`);
    for (let offset = 3; offset < current.data.length; offset += 4) {
      assert.equal(current.data[offset], modernDecoded[stage].data[offset],
        `Stage ${stage} must use the exact shared alpha geometry at pixel ${Math.floor(offset / 4)}`);
    }
    const metrics = art.assertImageMetrics(await art.readImageMetrics(retroStages[stage]), { targetSize: 1024, visibleBounds });
    assert.equal(metrics.bounds.left, 123); assert.equal(metrics.bounds.width, 778);
    assert.equal(metrics.bounds.top + metrics.bounds.height, 901);
    assert.equal(metrics.components.meaningfulCount, 1);
    visible.push(metrics.visiblePixels);
    if (!stage) continue;
    const prior = retroDecoded[stage - 1].data;
    for (let offset = 0; offset < prior.length; offset += 4) {
      if (prior[offset + 3] !== 255) continue;
      assert.deepEqual(current.data.subarray(offset, offset + 4), prior.subarray(offset, offset + 4),
        `Retro stage ${stage} must retain every opaque pixel from stage ${stage - 1}`);
    }
  }
  for (let stage = 1; stage < visible.length; stage++) {
    assert.ok(visible[stage] > visible[stage - 1], `Retro stage ${stage} must add visible geometry`);
  }
  const alphaAt = (stage, x, y) => retroDecoded[stage].data[(y * 1024 + x) * 4 + 3];
  for (const { stage, point: [x, y], label } of [
    { stage: 1, point: [220, 500], label: 'posts' },
    { stage: 2, point: [512, 235], label: 'crossbar' },
    { stage: 3, point: [512, 380], label: 'head' },
    { stage: 4, point: [512, 570], label: 'torso' },
    { stage: 5, point: [376, 570], label: 'arms' },
    { stage: 6, point: [456, 748], label: 'feet' },
  ]) {
    assert.equal(alphaAt(stage - 1, x, y), 0, `${label} must not appear before Retro stage ${stage}`);
    assert.ok(alphaAt(stage, x, y) >= 250, `${label} must be unmistakable at Retro stage ${stage}`);
  }
});

test('Retro Hangman normalizes as one downscaled group and preserves every Modern Hangman byte', async (t) => {
  const generator = await loadRetroHangmanGenerator();
  assert.equal(typeof generator.renderRetroHangmanStage, 'function',
    'renderRetroHangmanStage must provide group-normalizable sources');
  const modernSourceHashes = [
    'e623b14fa530f6db1e0b9781102d7f74578e5a9b66a7f85addf03068cd36287b',
    'b33b692537c3a18ada578c564d91377cfad5b500d4e1574fd96eee724a219080',
    '59f4b22253bf22fa667b185bb30cfadd0f2abdc92a504c470c5faed6fa507ca5',
    '5c94c3769114673e2d0c1e15bcb81bc6ce9ade6e211374964632c8dda25a4b64',
    '1169acfd0f44cb8d05e3967e2ff1c18e36512bf1aa55bc88c596d9c1c9d46a65',
    '0422ebe17a73eeef2074a2e05c2034007d49742c2195110f6f612e074f4e25cd',
    'b8e14e3ae17c98fd19dd028df5e973859dac4e62b615ebc8f389d2f43ca516af',
  ];
  const modernFinalHashes = [
    'cb6d553a808cbfcb718e196f0ed7b716491a5976c3788cb83fe19eae9da62868',
    '3004c98d16357937b55189c9407a066bcc3f7642a2a8df114321ce633da42474',
    '156bd2dafe88c06d0e389e271d0c049b17793345c18e851d6080dbcc21f1c208',
    'db463f7f13c9245788fba752da6ea08520df3ec2b8ed6f0ac1f6a417cc1c05fe',
    'ccfc465cfd247b075fede5c181d1e32d5045aa8e82835f7a8474e86f3cc48ef9',
    'd243617f3890d7c2c00789b17ff95940107e261deba4050671c54a9eec4a128f',
    '9706c615951a13e5f347ce9152c9b0799ffa7517b07c92cb61cfbb1c95965bf1',
  ];
  const hash = (input) => createHash('sha256').update(input).digest('hex');
  assert.deepEqual(Array.from({ length: 7 }, (_, stage) => hash(readFileSync(resolve(root,
    `docs/design/source-art/modern/hangman/stage-${stage}.png`)))), modernSourceHashes);
  assert.deepEqual(Array.from({ length: 7 }, (_, stage) => hash(readFileSync(resolve(root,
    `assets/pieces/modern/hangman/stage-${stage}.webp`)))), modernFinalHashes);

  const dir = mkdtempSync(resolve(tmpdir(), 'retro-hangman-authoring-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const records = [];
  for (let stage = 0; stage < 7; stage++) {
    const record = individualRecord({ theme: 'retro', family: 'hangman', role: `stage-${stage}`,
      sourcePath: `docs/design/source-art/retro/hangman/stage-${stage}.png`,
      finalPath: `assets/pieces/retro/hangman/stage-${stage}.webp`, targetSize: 384,
      generator: 'scripts/generate-retro-hangman.mjs' });
    const path = resolve(dir, record.sourcePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, await generator.renderRetroHangmanStage(stage));
    records.push(record);
  }
  const { results, transform } = await art.normalizeHangmanGroup(records, { root: dir, write: false });
  assert.ok(transform.scale > 0 && transform.scale < 1, 'Retro production normalization must downscale, never upscale');
  assert.deepEqual(transform.sourceBounds, { left: 123, top: 206, width: 778, height: 695 });
  assert.deepEqual([...new Set(results.map(({ metrics }) => metrics.bounds.top + metrics.bounds.height))], [338]);
  assert.equal(new Set(results.map(({ data }) => hash(data))).size, 7);
});

test('theme entrypoints supply only material and decor tokens to shared Hangman geometry', async () => {
  for (const file of ['generate-modern-hangman.mjs', 'generate-retro-hangman.mjs', 'generate-arcade-hangman.mjs']) {
    const path = resolve(root, 'scripts', file);
    assert.ok(existsSync(path), file + ' must exist as an explicit theme entrypoint');
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /<(?:rect|path|circle|ellipse)\b/,
      file + ' must not contain structural SVG shapes or paths');
  }
  const modern = await loadModernHangmanGenerator();
  const retro = await loadRetroHangmanGenerator();
  const arcade = await loadArcadeHangmanGenerator();
  const { createHangmanRenderer } = await import('./hangman-geometry.mjs');
  for (const [label, theme, render] of [
    ['Modern', modern.MODERN_HANGMAN_THEME, modern.renderModernHangmanStage],
    ['Retro', retro.RETRO_HANGMAN_THEME, retro.renderRetroHangmanStage],
    ['Arcade', arcade.ARCADE_HANGMAN_THEME, arcade.renderArcadeHangmanStage],
  ]) {
    assert.equal(typeof theme, 'object', `${label} must expose material-only shared geometry configuration`);
    assert.deepEqual(Object.keys(theme).sort(), ['decor', 'defs', 'materials', 'themeName']);
    const sharedRender = createHangmanRenderer(theme);
    assert.deepEqual(await sharedRender(6), await render(6),
      `${label} entrypoint and shared geometry must render identical complete stages`);
  }
});

test('fresh three-theme rendering reproduces all 21 sources and all 21 normalized finals byte-for-byte', async (t) => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  const modern = await loadModernHangmanGenerator();
  const retro = await loadRetroHangmanGenerator();
  const arcade = await loadArcadeHangmanGenerator();
  const themes = [
    { name: 'modern', render: modern.renderModernHangmanStage },
    { name: 'retro', render: retro.renderRetroHangmanStage },
    { name: 'arcade', render: arcade.renderArcadeHangmanStage },
  ];
  for (const { name, render } of themes) {
    assert.equal(typeof render, 'function', name + ' Hangman renderer must exist for exhaustive reproduction');
  }
  const hash = (input) => createHash('sha256').update(input).digest('hex');
  let sourceComparisons = 0; let finalComparisons = 0; let arcadeRepeatComparisons = 0;

  for (const { name, render } of themes) {
    const dir = mkdtempSync(resolve(tmpdir(), `${name}-hangman-reproduction-`));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const records = manifest.records.filter((record) => record.theme === name && record.family === 'hangman');
    assert.deepEqual(records.map((record) => record.role), Array.from({ length: 7 }, (_, stage) => `stage-${stage}`));
    for (let stage = 0; stage < 7; stage++) {
      const rendered = await render(stage);
      const committed = readFileSync(resolve(root, records[stage].sourcePath));
      assert.equal(hash(rendered), hash(committed), `${name} stage ${stage} source hash must reproduce`);
      assert.deepEqual(rendered, committed, `${name} stage ${stage} source bytes must reproduce`);
      sourceComparisons++;
      if (name === 'arcade') {
        assert.deepEqual(await render(stage), rendered, `arcade stage ${stage} repeat render must be byte-identical`);
        arcadeRepeatComparisons++;
      }
      const path = resolve(dir, records[stage].sourcePath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, rendered);
    }
    const normalized = await art.normalizeHangmanGroup(records, { root: dir, write: false });
    assert.ok(normalized.transform.scale > 0 && normalized.transform.scale < 1,
      name + ' production normalization must downscale, never upscale');
    assert.deepEqual(normalized.transform.sourceBounds, { left: 123, top: 206, width: 778, height: 695 });
    assert.equal(normalized.transform.baseY, 338, name + ' normalization must retain the shared base anchor');
    for (let stage = 0; stage < 7; stage++) {
      const committed = readFileSync(resolve(root, records[stage].finalPath));
      assert.equal(hash(normalized.results[stage].data), hash(committed),
        `${name} stage ${stage} normalized final hash must reproduce`);
      assert.deepEqual(normalized.results[stage].data, committed,
        `${name} stage ${stage} normalized final bytes must reproduce`);
      finalComparisons++;
    }
  }
  assert.equal(sourceComparisons, 21);
  assert.equal(finalComparisons, 21);
  assert.equal(arcadeRepeatComparisons, 7);
});

test('Arcade Hangman authoring uses the fixed shared platform and deterministic bytes', async () => {
  const generator = await loadArcadeHangmanGenerator();
  assert.equal(typeof generator.renderArcadeHangmanStage, 'function',
    'renderArcadeHangmanStage must provide deterministic Arcade source authoring');
  assert.equal(generator.ARCADE_HANGMAN_GENERATOR, 'scripts/generate-arcade-hangman.mjs');
  const first = await generator.renderArcadeHangmanStage(0);
  const second = await generator.renderArcadeHangmanStage(0);
  assert.deepEqual(first, second, 'Repeated Arcade authoring must produce byte-identical PNGs');
  const metrics = art.assertImageMetrics(await art.readImageMetrics(first), { targetSize: 1024, visibleBounds });
  assert.deepEqual(metrics.bounds, { left: 123, top: 789, width: 778, height: 112 });
  assert.equal(metrics.bounds.top + metrics.bounds.height, 901);
  assert.equal(metrics.components.meaningfulCount, 1);
});

test('Arcade Hangman shares alpha geometry, semantic progression, retention, and solid readable styling', async () => {
  const modern = await loadModernHangmanGenerator();
  const arcade = await loadArcadeHangmanGenerator();
  assert.equal(typeof arcade.renderArcadeHangmanStage, 'function', 'Arcade renderer is required');
  const modernStages = await Promise.all(Array.from({ length: 7 }, (_, stage) => modern.renderModernHangmanStage(stage)));
  const arcadeStages = await Promise.all(Array.from({ length: 7 }, (_, stage) => arcade.renderArcadeHangmanStage(stage)));
  const decode = (input) => sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const modernDecoded = await Promise.all(modernStages.map(decode));
  const arcadeDecoded = await Promise.all(arcadeStages.map(decode));
  assert.equal(new Set(arcadeStages.map((input) => createHash('sha256').update(input).digest('hex'))).size, 7);
  const visible = [];
  for (let stage = 0; stage < 7; stage++) {
    const current = arcadeDecoded[stage];
    assert.deepEqual(current.info, modernDecoded[stage].info, 'Arcade stage ' + stage + ' must use the shared canvas');
    for (let offset = 3; offset < current.data.length; offset += 4) {
      assert.equal(current.data[offset], modernDecoded[stage].data[offset],
        'Arcade stage ' + stage + ' must use the shared alpha mask at pixel ' + Math.floor(offset / 4));
    }
    const metrics = art.assertImageMetrics(await art.readImageMetrics(arcadeStages[stage]), { targetSize: 1024, visibleBounds });
    assert.equal(metrics.bounds.left, 123); assert.equal(metrics.bounds.width, 778);
    assert.equal(metrics.bounds.top + metrics.bounds.height, 901);
    assert.equal(metrics.components.meaningfulCount, 1);
    visible.push(metrics.visiblePixels);
    if (!stage) continue;
    const prior = arcadeDecoded[stage - 1].data;
    for (let offset = 0; offset < prior.length; offset += 4) {
      if (prior[offset + 3] !== 255) continue;
      assert.deepEqual(current.data.subarray(offset, offset + 4), prior.subarray(offset, offset + 4),
        'Arcade stage ' + stage + ' must retain every prior opaque pixel');
    }
  }
  for (let stage = 1; stage < visible.length; stage++) {
    assert.ok(visible[stage] > visible[stage - 1], 'Arcade stage ' + stage + ' must grow visibly');
  }
  const alphaAt = (stage, x, y) => arcadeDecoded[stage].data[(y * 1024 + x) * 4 + 3];
  for (const addition of [
    { stage: 1, point: [220, 500], label: 'posts' },
    { stage: 2, point: [512, 235], label: 'crossbar' },
    { stage: 3, point: [512, 380], label: 'head' },
    { stage: 4, point: [512, 570], label: 'torso' },
    { stage: 5, point: [376, 570], label: 'arms' },
    { stage: 6, point: [456, 748], label: 'feet' },
  ]) {
    const [x, y] = addition.point;
    assert.equal(alphaAt(addition.stage - 1, x, y), 0, addition.label + ' must not appear early');
    assert.ok(alphaAt(addition.stage, x, y) >= 250, addition.label + ' must be unmistakable');
  }

  const complete = arcadeDecoded[6];
  const pixel = (x, y) => [...complete.data.subarray((y * complete.info.width + x) * 4,
    (y * complete.info.width + x) * 4 + 4)];
  const boundary = pixel(123, 845); const center = pixel(512, 825);
  const face = pixel(512, 390); const eye = pixel(479, 383); const smile = pixel(512, 416);
  for (const [label, rgba] of [['boundary', boundary], ['center', center], ['face', face], ['eye', eye], ['smile', smile]]) {
    assert.equal(rgba[3], 255, label + ' must be fully opaque and readable without glow');
  }
  assert.ok(Math.max(...boundary.slice(0, 3)) <= 80, 'Boundary must be a solid dark outline');
  assert.ok(center[1] > center[0] && center[2] > center[0], 'Platform center must read as cyan plastic');
  assert.ok(Math.max(...face.slice(0, 3)) <= 80, 'Face center must stay solid and dark');
  assert.ok(eye[1] >= 160 && eye[2] >= 180, 'Friendly eye must be bright cyan');
  assert.ok(smile[1] >= 140 && smile[2] >= 170, 'Friendly smile must be bright cyan');
});

test('all accepted Retro Hangman source and final bytes remain pinned', () => {
  const hash = (input) => createHash('sha256').update(input).digest('hex');
  const sourceHashes = [
    '3bcf8b3908ecd31e40ced5720253b0054171fed59150fc376bfb330792733dbd',
    '44b6c153a18578181cc64b0c37c73a4c74357c15bdf62d880bb72ba119265c81',
    'db42ebd47ee391f004d6333fb2d543de566ec82a306a658b55ffe93cd78b2c04',
    '6b5fcba66c28cc72d40704af2d810f37705db9ca844c2a84bd3ab03676168106',
    'c04cbc9fa2751e4e4c448f693a0450e755daad961163d9c5648dde252c39f2c1',
    'd1555f4f2a891a520da2563987cbacf56f982c8e0f17d88c277b4f532c9c2688',
    '7a9642be38549ead5a903c71ac18e80dcda753b8696be9ec7aadfda6ee7f9ecb',
  ];
  const finalHashes = [
    '0c402135f2bb943827d079022ab9d17e89ea90e325d0afb6ecaa8b890f56ddbc',
    'a7f94503537691ecb4d8caad54a01f67c43139d58aa86b3561b0e28ad07dee7c',
    'e841781f3c585f6e27514ab77f856f5ee334cd12e26922e16bd9a254a11812ac',
    'f99fc1e5d9a6dda7e3691398a27a31c4518b5b700c4cd2e59b5bc80f15e80fc0',
    '1d5238e5b2884293c57f0525c39ad0936c87172f92c812741047a146739abf6c',
    '5953c2aba702e0efb8ae247fe70fa738ed009055ca0540f2bfcc2fe2bb9ec993',
    '959b08f9af2544e0485b878119a0bbe3b80020f624df60071a4aad03f632830f',
  ];
  for (let stage = 0; stage < 7; stage++) {
    assert.equal(hash(readFileSync(resolve(root, 'docs/design/source-art/retro/hangman/stage-' + stage + '.png'))),
      sourceHashes[stage], 'Retro stage ' + stage + ' source must remain byte-identical');
    assert.equal(hash(readFileSync(resolve(root, 'assets/pieces/retro/hangman/stage-' + stage + '.webp'))),
      finalHashes[stage], 'Retro stage ' + stage + ' final must remain byte-identical');
  }
});

test('Arcade Hangman QA sheets reproduce all seven finals in order at full and phone sizes', async () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  const records = manifest.records.filter((record) => record.theme === 'arcade' && record.family === 'hangman');
  assert.deepEqual(records.map((record) => record.role),
    Array.from({ length: 7 }, (_, stage) => 'stage-' + stage));
  for (const qa of [
    { mode: 'full-light', cellSize: 384, background: '#f5f5f5' },
    { mode: 'full-dark', cellSize: 384, background: '#101020' },
    { mode: 'phone-light', cellSize: 160, background: '#f5f5f5' },
    { mode: 'phone-dark', cellSize: 160, background: '#101020' },
  ]) {
    const path = resolve(root, 'docs/design/qa/arcade-hangman-' + qa.mode + '.webp');
    assert.ok(existsSync(path), 'Arcade Hangman ' + qa.mode + ' QA sheet must exist');
    const fresh = await art.createContactSheet(records,
      { root, columns: 4, cellSize: qa.cellSize, background: qa.background, format: 'raw' });
    const expected = await sharp(path).ensureAlpha().raw().toBuffer();
    assert.equal(fresh.equals(expected), true, 'Arcade Hangman ' + qa.mode + ' QA sheet must reproduce pixel-for-pixel');
  }
});
