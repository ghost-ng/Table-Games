/** Deterministic source authoring for the seven Arcade Hangman stages. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHangmanRenderer, HANGMAN_SOURCE_SIZE } from './hangman-geometry.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ARCADE_HANGMAN_GENERATOR = 'scripts/generate-arcade-hangman.mjs';
export const ARCADE_HANGMAN_SOURCE_SIZE = HANGMAN_SOURCE_SIZE;

const defs = [
  '<defs>',
  '  <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">',
  '    <stop offset="0" stop-color="#47f4ff"/><stop offset="0.2" stop-color="#0b8fa8"/><stop offset="0.58" stop-color="#075269"/><stop offset="1" stop-color="#032d42"/>',
  '  </linearGradient>',
  '  <linearGradient id="blue-soft" x1="0" y1="0" x2="1" y2="1">',
  '    <stop offset="0" stop-color="#5ff7ff"/><stop offset="0.22" stop-color="#0b9db4"/><stop offset="0.62" stop-color="#075066"/><stop offset="1" stop-color="#022a3d"/>',
  '  </linearGradient>',
  '  <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">',
  '    <stop offset="0" stop-color="#b8fbff"/><stop offset="0.24" stop-color="#4fc4d2"/><stop offset="0.62" stop-color="#176478"/><stop offset="1" stop-color="#073044"/>',
  '  </linearGradient>',
  '  <linearGradient id="white-shell" x1="0" y1="0" x2="1" y2="1">',
  '    <stop offset="0" stop-color="#aefbff"/><stop offset="0.2" stop-color="#33b8ca"/><stop offset="0.6" stop-color="#0b5b70"/><stop offset="1" stop-color="#042b3c"/>',
  '  </linearGradient>',
  '  <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">',
  '    <stop offset="0" stop-color="#0a3445"/><stop offset="0.48" stop-color="#041b29"/><stop offset="1" stop-color="#020d17"/>',
  '  </linearGradient>',
  '  <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">',
  '    <stop offset="0" stop-color="#c7fdff"/><stop offset="0.45" stop-color="#43efff"/><stop offset="1" stop-color="#08a8c3"/>',
  '  </linearGradient>',
  '</defs>',
].join('\n');

export const ARCADE_HANGMAN_THEME = {
  themeName: 'Arcade',
  defs,
  materials: {
    limbConnector: '#041b29',
    bodyOutline: '#031923',
    limbSurface: 'url(#blue-soft)',
    feetHighlight: '#58e8f4',
    armsHighlight: '#62edf7',
    shell: 'url(#white-shell)',
    shellHighlight: '#b7fcff',
    accent: 'url(#blue)',
    inset: '#073246',
    indicator: 'url(#cyan)',
    torsoDetail: '#0b8092',
    connectorMetal: 'url(#silver)',
    face: 'url(#face)',
    eye: 'url(#cyan)',
    smile: '#44eaff',
    frameOutline: '#031923',
    frameMetal: 'url(#silver)',
    frameSurface: 'url(#blue)',
    crossbarHighlight: '#58e8f4',
    crossbarRivet: '#8cf8ff',
    postsHighlight: '#45dae8',
    postsFoot: '#1c7688',
    platformInset: '#064052',
    platformHighlight: '#31d9e8',
    platformRivet: '#67f3ff',
  },
  decor: {},
};

export const renderArcadeHangmanStage = createHangmanRenderer(ARCADE_HANGMAN_THEME);

export async function writeArcadeHangmanSources({ root = projectRoot } = {}) {
  const outputs = [];
  for (let stage = 0; stage <= 6; stage++) {
    const relativePath = 'docs/design/source-art/arcade/hangman/stage-' + stage + '.png';
    const path = resolve(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    const data = await renderArcadeHangmanStage(stage);
    await writeFile(path, data);
    outputs.push({ stage, relativePath, data });
  }
  return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeArcadeHangmanSources().then((outputs) => {
    for (const { stage, relativePath } of outputs) {
      console.log('arcade/hangman/stage-' + stage + ': ' + relativePath);
    }
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
