/** Deterministic, individual-source game-art validation and authoring helpers. */
import assert from 'node:assert/strict';
import { lstat, mkdir, readFile, readlink, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import sharp from 'sharp';

export const MAX_GAME_ART_BYTES = 2 * 1024 * 1024;
export const MAX_GAME_ART_FILE_BYTES = 64 * 1024;
export const VISIBLE_BOUNDS = Object.freeze({ minFill: 0.72, maxFill: 0.80, safePadding: 0.10 });

const THEMES = ['modern', 'retro', 'arcade'];
const STAGES = ['contract-only', 'individual-assets', 'accepted'];
const REQUIRED_FIELDS = ['theme', 'family', 'role', 'prompt', 'sourcePath', 'finalPath', 'targetSize',
  'visibleBounds', 'generatedAt', 'reviewedAt'];
const RECORD_FIELDS = new Set([...REQUIRED_FIELDS, 'expectedOwner', 'legacy', 'authorityReferencePending']);

function assertRelativePath(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && !/^(?:\/|[A-Za-z]:)|\\/.test(path)
    && !path.split('/').some((part) => ['', '.', '..'].includes(part)), `Repository-relative path required: ${path}`);
}

/** Validate portable metadata; requiredPaths supplies exhaustive runtime catalog coverage. */
export function validateManifest(manifest, { requiredPaths } = {}) {
  assert.equal(manifest?.schemaVersion, 1, 'Individual manifest schemaVersion must be 1');
  assert.ok(STAGES.includes(manifest.stage), 'Unknown manifest stage');
  assert.ok(Array.isArray(manifest.records) && manifest.records.length > 0, 'Manifest requires individual records');
  const identities = new Set(); const outputs = new Set(); const familySizes = new Map();
  for (const record of manifest.records) {
    assert.ok(record && typeof record === 'object', 'Individual record required');
    for (const key of REQUIRED_FIELDS) assert.ok(Object.hasOwn(record, key), `Missing ${key}`);
    for (const key of Object.keys(record)) assert.ok(RECORD_FIELDS.has(key), `Unsupported record field: ${key}`);
    assert.ok(THEMES.includes(record.theme), 'Unknown asset theme');
    for (const key of ['family', 'role']) assert.match(record[key], /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `Invalid ${key}`);
    assert.ok(typeof record.prompt === 'string' && record.prompt.trim().length > 0, 'Recorded prompt required');
    for (const key of ['generatedAt', 'reviewedAt']) {
      assert.ok(typeof record[key] === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(record[key])
        && Number.isFinite(Date.parse(record[key])), `Valid ${key} date required`);
    }
    if (record.expectedOwner !== undefined) assert.ok(typeof record.expectedOwner === 'string' && record.expectedOwner.trim(), 'Invalid expectedOwner');
    assertRelativePath(record.sourcePath); assertRelativePath(record.finalPath);
    assert.equal(record.finalPath, `assets/pieces/${record.theme}/${record.family}/${record.role}.webp`, 'Final path must identify its theme/family/role');
    assert.ok(Number.isInteger(record.targetSize) && record.targetSize > 0, 'Positive integer targetSize required');
    assert.deepEqual(record.visibleBounds, VISIBLE_BOUNDS, 'Visible bounds cannot weaken 72–80% fill or 10% safe padding');
    const identity = `${record.theme}/${record.family}/${record.role}`;
    assert.ok(!identities.has(identity) && !outputs.has(record.finalPath), `Duplicate asset: ${identity}`);
    identities.add(identity); outputs.add(record.finalPath);
    if (familySizes.has(record.family)) assert.equal(record.targetSize, familySizes.get(record.family), 'Family dimensions must match');
    familySizes.set(record.family, record.targetSize);
    if (Object.hasOwn(record, 'legacy')) {
      assert.ok(manifest.stage === 'contract-only' && record.legacy === true, 'legacy is allowed only during contract-only migration');
      assert.equal(record.sourcePath, record.finalPath, 'Legacy sources must identify the committed final sprite');
    }
    if (Object.hasOwn(record, 'authorityReferencePending')) {
      assert.ok(record.authorityReferencePending === true && record.family === 'coin-flip', 'Only coin-flip can be authorityReferencePending');
      assert.notEqual(manifest.stage, 'accepted', 'Pending authority references cannot pass final acceptance');
      assert.ok(!Object.hasOwn(record, 'legacy'), 'Pending and legacy statuses are mutually exclusive');
    }
    if (!record.legacy && !record.authorityReferencePending) {
      assert.notEqual(record.sourcePath, record.finalPath, 'Individual source path must differ from final output path');
    }
  }
  for (const record of manifest.records) {
    assert.ok(!outputs.has(record.sourcePath) || (record.sourcePath === record.finalPath
      && (record.legacy === true || record.authorityReferencePending === true)),
    `Final output collides with another registered source: ${record.sourcePath}`);
  }
  if (requiredPaths) assert.deepEqual([...outputs].sort(), [...requiredPaths].sort(), 'Manifest catalog coverage must be exact');
  return manifest.records;
}

function connectedComponents(alpha, width, height) {
  // Geometry uses every nonzero alpha pixel. Connectivity uses 5% alpha to avoid
  // treating a faint glow bridge as one solid object; no pixels are removed.
  const visited = new Uint8Array(alpha.length); const queue = new Int32Array(alpha.length);
  const sizes = [];
  for (let seed = 0; seed < alpha.length; seed++) {
    if (visited[seed] || alpha[seed] < 13) continue;
    let head = 0; let tail = 1; queue[0] = seed; visited[seed] = 1;
    while (head < tail) {
      const pixel = queue[head++]; const x = pixel % width; const y = Math.floor(pixel / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
          const neighbor = (y + dy) * width + x + dx;
          if (!visited[neighbor] && alpha[neighbor] >= 13) {
            visited[neighbor] = 1; queue[tail++] = neighbor;
          }
        }
      }
    }
    sizes.push(tail);
  }
  sizes.sort((a, b) => b - a);
  const pixels = sizes.reduce((sum, size) => sum + size, 0);
  const threshold = Math.max(4, Math.ceil(pixels * 0.01));
  return { count: sizes.length, meaningfulCount: sizes.filter((size) => size >= threshold).length,
    largestFraction: pixels ? sizes[0] / pixels : 0, sizes };
}

/** Inspect original decoded alpha; ensureAlpha never substitutes for hasAlpha. */
export async function readImageMetrics(input) {
  const image = sharp(input, { failOn: 'error' });
  const metadata = await image.metadata();
  assert.ok(!metadata.pages || metadata.pages === 1, 'Animated/multipage source images are not individual sprites');
  const { data, info } = await image.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alpha = new Uint8Array(width * height);
  let left = width; let top = height; let right = -1; let bottom = -1; let visiblePixels = 0;
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    alpha[pixel] = data[pixel * channels + channels - 1];
    if (alpha[pixel] === 0) continue;
    const x = pixel % width; const y = Math.floor(pixel / width);
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    visiblePixels++;
  }
  const bounds = visiblePixels ? { left, top, width: right - left + 1, height: bottom - top + 1 } : null;
  return { width, height, format: metadata.format, hasAlpha: metadata.hasAlpha === true, bounds, visiblePixels,
    visibleFill: bounds ? Math.max(bounds.width / width, bounds.height / height) : 0,
    padding: bounds ? { left, top, right: width - right - 1, bottom: height - bottom - 1 } : null,
    transparentCorners: [0, width - 1, (height - 1) * width, width * height - 1].every((pixel) => alpha[pixel] === 0),
    edgeTouching: !!bounds && (left === 0 || top === 0 || right === width - 1 || bottom === height - 1),
    components: connectedComponents(alpha, width, height) };
}

/** Fail on invalid composition. This function never repairs or removes pixels. */
export function assertImageMetrics(metrics, { targetSize, visibleBounds = VISIBLE_BOUNDS } = {}) {
  assert.equal(metrics.width, metrics.height, 'Sprite dimensions must be square');
  if (targetSize !== undefined) assert.equal(metrics.width, targetSize, 'Sprite dimensions must match targetSize');
  assert.ok(metrics.hasAlpha, 'A genuine alpha channel is required');
  assert.ok(metrics.transparentCorners, 'All four corners must be transparent');
  assert.ok(metrics.bounds && metrics.visiblePixels > 0, 'Sprite must contain visible pixels; empty art is invalid');
  assert.ok(!metrics.edgeTouching, 'Edge-touching silhouettes are invalid');
  for (const padding of Object.values(metrics.padding)) {
    assert.ok(padding >= Math.ceil(metrics.width * visibleBounds.safePadding), 'Sprite must retain safe alpha padding on every side');
  }
  assert.ok(metrics.visibleFill >= visibleBounds.minFill && metrics.visibleFill <= visibleBounds.maxFill,
    `Visible fill ${metrics.visibleFill.toFixed(4)} must remain between ${visibleBounds.minFill} and ${visibleBounds.maxFill}`);
  assert.ok(metrics.components.meaningfulCount === 1 && metrics.components.largestFraction >= 0.95,
    'Sprite must have one dominant connected component; extra objects are invalid');
  return metrics;
}

async function containedPath(root, relativePath, { output = false } = {}) {
  assertRelativePath(relativePath);
  const project = await realpath(root); const path = resolve(project, relativePath);
  let existing = path;
  if (output) {
    while (true) {
      try {
        assert.ok(!(await lstat(existing)).isSymbolicLink(), `Output symbolic links are invalid: ${relativePath}`);
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        existing = dirname(existing);
      }
    }
  }
  const actual = await realpath(existing);
  assert.ok(actual === project || actual.startsWith(project + sep), `Path escapes outside project: ${relativePath}`);
  return path;
}

/** Compare every selected output with every registered source, not just its own. */
export async function assertManifestSourcePreservation(manifest, { root = process.cwd(), selectedRecords = manifest.records } = {}) {
  validateManifest(manifest);
  const project = await realpath(root);
  const sourcesByPath = new Map(); const sourcesByIdentity = new Map();
  for (const record of manifest.records) {
    const source = await canonicalPath(resolve(project, record.sourcePath));
    assert.ok(source.startsWith(project + sep), `Registered source escapes outside project: ${record.sourcePath}`);
    sourcesByPath.set(source, record.sourcePath);
    try {
      const metadata = await stat(source, { bigint: true });
      sourcesByIdentity.set(`${metadata.dev}:${metadata.ino}`, record.sourcePath);
    } catch (error) {
      // Unselected sources may not have been generated yet; their canonical
      // paths (including dangling links) must still be protected before writes.
      if (error.code !== 'ENOENT') throw error;
    }
  }
  for (const record of selectedRecords) {
    const finalPath = await containedPath(root, record.finalPath, { output: true });
    const sourcePath = sourcesByPath.get(await canonicalPath(finalPath));
    assert.equal(sourcePath, undefined, `Final output ${record.finalPath} collides with registered source ${sourcePath}`);
    try {
      const metadata = await stat(finalPath, { bigint: true });
      const source = sourcesByIdentity.get(`${metadata.dev}:${metadata.ino}`);
      assert.equal(source, undefined, `Final output ${record.finalPath} aliases registered source ${source}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

/** Resolve file/directory aliases even when the final file has not been created. */
async function canonicalPath(path, seenLinks = new Set()) {
  try { return await realpath(path); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let existing = path;
  while (true) {
    let metadata;
    try { metadata = await lstat(existing); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      existing = dirname(existing); continue;
    }
    const suffix = relative(existing, path);
    if (metadata.isSymbolicLink()) {
      assert.ok(!seenLinks.has(existing), 'Registered source symbolic links cannot form a cycle');
      seenLinks.add(existing);
      const parent = await realpath(dirname(existing));
      const target = resolve(parent, await readlink(existing));
      return resolve(await canonicalPath(target, seenLinks), suffix);
    }
    return resolve(await realpath(existing), suffix);
  }
}

/** Validate one individual source and write exactly its requested final WebP. */
export async function normalizeGameArtAsset(record, { root = process.cwd(), write = true } = {}) {
  assert.ok(!Object.hasOwn(record, 'legacy'), 'Cannot normalize legacy placeholders; replace the source first');
  assert.ok(!Object.hasOwn(record, 'authorityReferencePending'), 'Cannot normalize pending authority references');
  validateManifest({ schemaVersion: 1, stage: 'individual-assets', records: [record] });
  const sourcePath = await containedPath(root, record.sourcePath);
  const finalPath = await containedPath(root, record.finalPath, { output: true });
  const sourceStat = await stat(sourcePath);
  try {
    const finalStat = await stat(finalPath);
    assert.ok(sourceStat.dev !== finalStat.dev || sourceStat.ino !== finalStat.ino,
      'Final output cannot alias and overwrite its individual source');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const input = await readFile(sourcePath);
  const source = assertImageMetrics(await readImageMetrics(input), { visibleBounds: record.visibleBounds });
  const largest = Math.max(source.bounds.width, source.bounds.height);
  const desired = Math.round(record.targetSize * 0.76);
  const scale = Math.min(1, desired / largest);
  const width = Math.max(1, Math.round(source.bounds.width * scale));
  const height = Math.max(1, Math.round(source.bounds.height * scale));
  assert.ok(Math.max(width, height) / record.targetSize >= record.visibleBounds.minFill,
    'Source is too small to meet visible fill without upscaling');
  const left = Math.floor((record.targetSize - width) / 2); const top = Math.floor((record.targetSize - height) / 2);
  const data = await sharp(input).extract(source.bounds)
    .resize(width, height, { fit: 'fill', withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .extend({ left, top, right: record.targetSize - width - left, bottom: record.targetSize - height - top,
      background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 86, alphaQuality: 100, effort: 6 }).toBuffer();
  const metrics = assertImageMetrics(await readImageMetrics(data), record);
  assert.ok(data.length <= MAX_GAME_ART_FILE_BYTES, 'Normalized WebP exceeds 64 KiB per-file budget');
  if (write) {
    let manifest;
    try {
      manifest = JSON.parse(await readFile(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      manifest = { schemaVersion: 1, stage: 'individual-assets', records: [record] };
    }
    await assertManifestSourcePreservation(manifest, { root, selectedRecords: [record] });
    await mkdir(dirname(finalPath), { recursive: true }); await writeFile(finalPath, data);
  }
  return { data, metrics, finalPath };
}

/** Arrange buffers, relative paths, or manifest records in input order for visual QA. */
export async function createContactSheet(inputs, { root = process.cwd(), columns = 6, cellSize = 160,
  background = '#f5f5f5', outputPath } = {}) {
  assert.ok(Array.isArray(inputs) && inputs.length > 0, 'Contact sheet requires images');
  assert.ok(Number.isInteger(columns) && columns > 0 && Number.isInteger(cellSize) && cellSize > 0, 'Positive contact sheet dimensions required');
  const composites = [];
  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index];
    const source = Buffer.isBuffer(input) ? input : await containedPath(root, typeof input === 'string' ? input : input.finalPath);
    const data = await sharp(source).resize(cellSize, cellSize, { fit: 'contain', withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    composites.push({ input: data, left: index % columns * cellSize, top: Math.floor(index / columns) * cellSize });
  }
  const data = await sharp({ create: { width: Math.min(columns, inputs.length) * cellSize,
    height: Math.ceil(inputs.length / columns) * cellSize, channels: 4, background } })
    .composite(composites).webp({ lossless: true, effort: 6 }).toBuffer();
  if (outputPath) {
    const path = await containedPath(root, outputPath, { output: true });
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, data);
  }
  return data;
}
