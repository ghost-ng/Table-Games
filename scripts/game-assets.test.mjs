import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
// Transpile only the pure catalog; no React Native or bitmap module is loaded.
function loadTs(relativePath, localRequire = require) {
  const output = ts.transpileModule(readFileSync(resolve(root, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}

test('production assets exist, contain WebP data, and belong to their theme', () => {
  const { THEME_NAMES, GAME_VISUAL_PATHS } = loadTs('src/game-visuals/catalog.ts');
  for (const theme of THEME_NAMES) {
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
    assert.deepEqual(registry.GAME_VISUALS[theme], GAME_VISUAL_PATHS[theme]);
    assert.equal(registry.getGameVisuals(theme), registry.GAME_VISUALS[theme]);
  }
});
