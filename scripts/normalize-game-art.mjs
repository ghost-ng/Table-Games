/** Normalize one individual source per manifest record; no sprite-sheet extraction. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertManifestSourcePreservation, normalizeGameArtAsset, validateManifest } from './game-art-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node scripts/normalize-game-art.mjs --all | --family <name> | --asset <theme/family/role>';

export function selectRecords(manifest, args) {
  assert.ok((args.length === 1 && args[0] === '--all')
    || (args.length === 2 && ['--family', '--asset'].includes(args[0])), usage);
  if (args[0] === '--asset') assert.match(args[1], /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/, usage);
  const selected = manifest.records.filter((record) => args[0] === '--all'
    || (args[0] === '--family' && record.family === args[1])
    || (args[0] === '--asset' && `${record.theme}/${record.family}/${record.role}` === args[1]));
  assert.ok(selected.length > 0, 'No matching assets for selector');
  return selected;
}

async function main() {
  const manifest = JSON.parse(await readFile(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
  const selected = selectRecords(manifest, process.argv.slice(2));
  validateManifest(manifest);
  // Preflight every selected record before writing; temporary migration records
  // must never be re-encoded or presented as accepted individual sources.
  for (const record of selected) {
    assert.ok(!Object.hasOwn(record, 'legacy'), `Replace legacy source before normalization: ${record.theme}/${record.family}/${record.role}`);
    assert.ok(!Object.hasOwn(record, 'authorityReferencePending'), `Authority reference pending: ${record.theme}/${record.family}/${record.role}`);
  }
  const normalized = [];
  for (const record of selected) normalized.push(await normalizeGameArtAsset(record, { root, write: false }));
  await assertManifestSourcePreservation(manifest, { root, selectedRecords: selected });
  for (let index = 0; index < selected.length; index++) {
    const record = selected[index]; const { finalPath, data } = normalized[index];
    await mkdir(dirname(finalPath), { recursive: true });
    await writeFile(finalPath, data);
    console.log(`${record.theme}/${record.family}/${record.role}: ${record.targetSize}px WebP`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
