/** Deterministic source authoring for the seven Modern Hangman stages. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHangmanRenderer, HANGMAN_SOURCE_SIZE } from './hangman-geometry.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODERN_HANGMAN_GENERATOR = 'scripts/generate-modern-hangman.mjs';
export const MODERN_HANGMAN_SOURCE_SIZE = HANGMAN_SOURCE_SIZE;

const defs = `
  <defs>
    <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f7cff"/><stop offset="0.48" stop-color="#1a56db"/><stop offset="1" stop-color="#0d318d"/>
    </linearGradient>
    <linearGradient id="blue-soft" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#67a4ff"/><stop offset="0.38" stop-color="#1a56db"/><stop offset="1" stop-color="#0a2d83"/>
    </linearGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#dbe8f4"/><stop offset="1" stop-color="#819bb7"/>
    </linearGradient>
    <linearGradient id="white-shell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.58" stop-color="#edf4fa"/><stop offset="1" stop-color="#aebfd1"/>
    </linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#193866"/><stop offset="0.45" stop-color="#0c203f"/><stop offset="1" stop-color="#061127"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9fbff"/><stop offset="1" stop-color="#14c9ee"/>
    </linearGradient>
  </defs>`;

export const MODERN_HANGMAN_THEME = {
  themeName: 'Modern',
  defs,
  materials: {
    limbConnector: '#0a2b76',
    bodyOutline: '#092760',
    limbSurface: 'url(#blue-soft)',
    feetHighlight: '#9bc6ff',
    armsHighlight: '#a9d1ff',
    shell: 'url(#white-shell)',
    shellHighlight: '#ffffff',
    accent: 'url(#blue)',
    inset: '#e9f7ff',
    indicator: 'url(#cyan)',
    torsoDetail: '#8ea8c2',
    connectorMetal: 'url(#silver)',
    face: 'url(#face)',
    eye: 'url(#cyan)',
    smile: '#5cecff',
    frameOutline: '#08265f',
    frameMetal: 'url(#silver)',
    frameSurface: 'url(#blue)',
    crossbarHighlight: '#9bc6ff',
    crossbarRivet: '#d8f2ff',
    postsHighlight: '#83b7ff',
    postsFoot: '#d5e7f7',
    platformInset: '#eaf5ff',
    platformHighlight: '#6fa9ff',
    platformRivet: '#79edff',
  },
  decor: {},
};

export const renderModernHangmanStage = createHangmanRenderer(MODERN_HANGMAN_THEME);

export async function writeModernHangmanSources({ root = projectRoot } = {}) {
  const outputs = [];
  for (let stage = 0; stage <= 6; stage++) {
    const relativePath = `docs/design/source-art/modern/hangman/stage-${stage}.png`;
    const path = resolve(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    const data = await renderModernHangmanStage(stage);
    await writeFile(path, data);
    outputs.push({ stage, relativePath, data });
  }
  return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeModernHangmanSources().then((outputs) => {
    for (const { stage, relativePath } of outputs) console.log(`modern/hangman/stage-${stage}: ${relativePath}`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
