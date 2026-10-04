/** Deterministic source authoring for the seven Retro Hangman stages. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHangmanRenderer, HANGMAN_SOURCE_SIZE } from './hangman-geometry.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const RETRO_HANGMAN_GENERATOR = 'scripts/generate-retro-hangman.mjs';
export const RETRO_HANGMAN_SOURCE_SIZE = HANGMAN_SOURCE_SIZE;

const defs = `
  <defs>
    <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d5aa62"/><stop offset="0.48" stop-color="#8B6914"/><stop offset="1" stop-color="#5a3d0d"/>
    </linearGradient>
    <linearGradient id="blue-soft" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e2bd78"/><stop offset="0.38" stop-color="#9b7420"/><stop offset="1" stop-color="#5b3b0e"/>
    </linearGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f5dfad"/><stop offset="0.35" stop-color="#c69a43"/><stop offset="1" stop-color="#74501d"/>
    </linearGradient>
    <linearGradient id="white-shell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1cf"/><stop offset="0.58" stop-color="#e8c98e"/><stop offset="1" stop-color="#a87832"/>
    </linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#65441d"/><stop offset="0.45" stop-color="#3d2814"/><stop offset="1" stop-color="#241509"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff4c9"/><stop offset="1" stop-color="#d6a84c"/>
    </linearGradient>
  </defs>`;

const woodGrain = { stroke: '#5b3a0e', opacity: '.2' };

export const RETRO_HANGMAN_THEME = {
  themeName: 'Retro',
  defs,
  materials: {
    limbConnector: '#5b3b0e',
    bodyOutline: '#4c3010',
    limbSurface: 'url(#blue-soft)',
    feetHighlight: '#f3d69d',
    armsHighlight: '#f6dca7',
    shell: 'url(#white-shell)',
    shellHighlight: '#fff5d8',
    accent: 'url(#blue)',
    inset: '#f4dfb5',
    indicator: 'url(#cyan)',
    torsoDetail: '#9c6f2f',
    connectorMetal: 'url(#silver)',
    face: 'url(#face)',
    eye: 'url(#cyan)',
    smile: '#f6d277',
    frameOutline: '#4b3010',
    frameMetal: 'url(#silver)',
    frameSurface: 'url(#blue)',
    crossbarHighlight: '#f2d397',
    crossbarRivet: '#f5d989',
    postsHighlight: '#e5bd75',
    postsFoot: '#d6aa61',
    platformInset: '#f4dfb5',
    platformHighlight: '#d7aa5c',
    platformRivet: '#e5bb62',
  },
  decor: {
    torsoGrain: { stroke: '#7a5220', opacity: '.2' },
    headGrain: { stroke: '#9f7130', opacity: '.18' },
    crossbarGrain: woodGrain,
    leftPostGrain: { stroke: '#5b3a0e', opacity: '.19' },
    rightPostGrain: { stroke: '#5b3a0e', opacity: '.19' },
    platformGrain: woodGrain,
  },
};

export const renderRetroHangmanStage = createHangmanRenderer(RETRO_HANGMAN_THEME);

export async function writeRetroHangmanSources({ root = projectRoot } = {}) {
  const outputs = [];
  for (let stage = 0; stage <= 6; stage++) {
    const relativePath = `docs/design/source-art/retro/hangman/stage-${stage}.png`;
    const path = resolve(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    const data = await renderRetroHangmanStage(stage);
    await writeFile(path, data);
    outputs.push({ stage, relativePath, data });
  }
  return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeRetroHangmanSources().then((outputs) => {
    for (const { stage, relativePath } of outputs) console.log(`retro/hangman/stage-${stage}: ${relativePath}`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
