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

const feet = `
  <g id="feet">
    <rect x="433" y="671" width="52" height="88" rx="25" fill="#5b3b0e"/>
    <rect x="539" y="671" width="52" height="88" rx="25" fill="#5b3b0e"/>
    <rect x="401" y="718" width="108" height="94" rx="45" fill="#4c3010"/>
    <rect x="515" y="718" width="108" height="94" rx="45" fill="#4c3010"/>
    <rect x="410" y="726" width="90" height="70" rx="34" fill="url(#blue-soft)"/>
    <rect x="524" y="726" width="90" height="70" rx="34" fill="url(#blue-soft)"/>
    <path d="M427 742c19-14 42-15 59-5" fill="none" stroke="#f3d69d" stroke-width="8" stroke-linecap="round" opacity=".72"/>
    <path d="M541 742c19-14 42-15 59-5" fill="none" stroke="#f3d69d" stroke-width="8" stroke-linecap="round" opacity=".72"/>
  </g>`;

const arms = `
  <g id="arms">
    <rect x="332" y="506" width="116" height="136" rx="57" fill="#4c3010"/>
    <rect x="576" y="506" width="116" height="136" rx="57" fill="#4c3010"/>
    <rect x="343" y="516" width="94" height="112" rx="46" fill="url(#blue-soft)"/>
    <rect x="587" y="516" width="94" height="112" rx="46" fill="url(#blue-soft)"/>
    <ellipse cx="375" cy="546" rx="18" ry="12" fill="#f6dca7" opacity=".74"/>
    <ellipse cx="619" cy="546" rx="18" ry="12" fill="#f6dca7" opacity=".74"/>
  </g>`;

const torso = `
  <g id="torso">
    <rect x="404" y="446" width="216" height="264" rx="84" fill="#4c3010"/>
    <rect x="416" y="458" width="192" height="240" rx="74" fill="url(#white-shell)"/>
    <path d="M431 503c33-33 91-43 143-22" fill="none" stroke="#fff5d8" stroke-width="14" stroke-linecap="round" opacity=".82"/>
    <rect x="450" y="522" width="124" height="94" rx="40" fill="url(#blue)"/>
    <rect x="463" y="535" width="98" height="62" rx="28" fill="#f4dfb5"/>
    <circle cx="512" cy="566" r="16" fill="url(#cyan)"/>
    <rect x="468" y="642" width="88" height="18" rx="9" fill="#9c6f2f"/>
    <path d="M450 676c30 8 71 8 119-2" fill="none" stroke="#7a5220" stroke-width="5" stroke-linecap="round" opacity=".2"/>
  </g>`;

const head = `
  <g id="head">
    <rect x="483" y="264" width="58" height="76" rx="27" fill="#4c3010"/>
    <rect x="491" y="270" width="42" height="62" rx="20" fill="url(#silver)"/>
    <rect x="396" y="300" width="232" height="190" rx="90" fill="#4c3010"/>
    <rect x="407" y="311" width="210" height="168" rx="79" fill="url(#white-shell)"/>
    <path d="M432 339c37-27 95-31 140-12" fill="none" stroke="#fff5d8" stroke-width="13" stroke-linecap="round" opacity=".86"/>
    <rect x="438" y="344" width="148" height="91" rx="42" fill="url(#face)"/>
    <circle cx="479" cy="383" r="12" fill="url(#cyan)"/>
    <circle cx="545" cy="383" r="12" fill="url(#cyan)"/>
    <path d="M477 406c21 20 49 20 70 0" fill="none" stroke="#f6d277" stroke-width="10" stroke-linecap="round"/>
    <path d="M438 455c35 9 78 8 118-3" fill="none" stroke="#9f7130" stroke-width="5" stroke-linecap="round" opacity=".18"/>
  </g>`;

const crossbar = `
  <g id="crossbar">
    <rect x="169" y="206" width="686" height="88" rx="43" fill="#4b3010"/>
    <rect x="179" y="216" width="666" height="68" rx="33" fill="url(#silver)"/>
    <rect x="206" y="226" width="612" height="47" rx="23" fill="url(#blue)"/>
    <path d="M228 237h420" fill="none" stroke="#f2d397" stroke-width="8" stroke-linecap="round" opacity=".7"/>
    <circle cx="771" cy="250" r="13" fill="#f5d989"/>
    <path d="M305 265c72-10 147-7 220 1" fill="none" stroke="#5b3a0e" stroke-width="5" stroke-linecap="round" opacity=".2"/>
  </g>`;

const posts = `
  <g id="posts">
    <rect x="169" y="242" width="108" height="588" rx="52" fill="#4b3010"/>
    <rect x="747" y="242" width="108" height="588" rx="52" fill="#4b3010"/>
    <rect x="181" y="254" width="84" height="564" rx="40" fill="url(#blue)"/>
    <rect x="759" y="254" width="84" height="564" rx="40" fill="url(#blue)"/>
    <path d="M201 281v429" fill="none" stroke="#e5bd75" stroke-width="11" stroke-linecap="round" opacity=".65"/>
    <path d="M779 281v429" fill="none" stroke="#e5bd75" stroke-width="11" stroke-linecap="round" opacity=".65"/>
    <rect x="194" y="742" width="58" height="54" rx="26" fill="#d6aa61" opacity=".8"/>
    <rect x="772" y="742" width="58" height="54" rx="26" fill="#d6aa61" opacity=".8"/>
    <path d="M227 355c8 84 5 169-2 252" fill="none" stroke="#5b3a0e" stroke-width="5" stroke-linecap="round" opacity=".19"/>
    <path d="M797 355c-8 84-5 169 2 252" fill="none" stroke="#5b3a0e" stroke-width="5" stroke-linecap="round" opacity=".19"/>
  </g>`;

const platform = `
  <g id="platform">
    <rect x="123" y="789" width="778" height="112" rx="52" fill="#4b3010"/>
    <rect x="133" y="799" width="758" height="92" rx="42" fill="url(#blue)"/>
    <rect x="151" y="810" width="722" height="37" rx="18" fill="url(#silver)"/>
    <rect x="168" y="818" width="688" height="20" rx="10" fill="#f4dfb5"/>
    <path d="M171 861h539" fill="none" stroke="#d7aa5c" stroke-width="10" stroke-linecap="round" opacity=".68"/>
    <circle cx="816" cy="863" r="13" fill="#e5bb62"/>
    <path d="M284 879c74-9 150-7 226 1" fill="none" stroke="#5b3a0e" stroke-width="5" stroke-linecap="round" opacity=".2"/>
  </g>`;

export const renderRetroHangmanStage = createHangmanRenderer({
  themeName: 'Retro', defs, groups: { feet, arms, torso, head, crossbar, posts, platform },
});

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
