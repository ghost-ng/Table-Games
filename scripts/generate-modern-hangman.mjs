/** Deterministic source authoring for the seven Modern Hangman stages. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODERN_HANGMAN_GENERATOR = 'scripts/generate-modern-hangman.mjs';
export const MODERN_HANGMAN_SOURCE_SIZE = 1024;

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

const feet = `
  <g id="feet">
    <rect x="433" y="671" width="52" height="88" rx="25" fill="#0a2b76"/>
    <rect x="539" y="671" width="52" height="88" rx="25" fill="#0a2b76"/>
    <rect x="401" y="718" width="108" height="94" rx="45" fill="#092760"/>
    <rect x="515" y="718" width="108" height="94" rx="45" fill="#092760"/>
    <rect x="410" y="726" width="90" height="70" rx="34" fill="url(#blue-soft)"/>
    <rect x="524" y="726" width="90" height="70" rx="34" fill="url(#blue-soft)"/>
    <path d="M427 742c19-14 42-15 59-5" fill="none" stroke="#9bc6ff" stroke-width="8" stroke-linecap="round" opacity=".72"/>
    <path d="M541 742c19-14 42-15 59-5" fill="none" stroke="#9bc6ff" stroke-width="8" stroke-linecap="round" opacity=".72"/>
  </g>`;

const arms = `
  <g id="arms">
    <rect x="332" y="506" width="116" height="136" rx="57" fill="#092760"/>
    <rect x="576" y="506" width="116" height="136" rx="57" fill="#092760"/>
    <rect x="343" y="516" width="94" height="112" rx="46" fill="url(#blue-soft)"/>
    <rect x="587" y="516" width="94" height="112" rx="46" fill="url(#blue-soft)"/>
    <ellipse cx="375" cy="546" rx="18" ry="12" fill="#a9d1ff" opacity=".74"/>
    <ellipse cx="619" cy="546" rx="18" ry="12" fill="#a9d1ff" opacity=".74"/>
  </g>`;

const torso = `
  <g id="torso">
    <rect x="404" y="446" width="216" height="264" rx="84" fill="#092760"/>
    <rect x="416" y="458" width="192" height="240" rx="74" fill="url(#white-shell)"/>
    <path d="M431 503c33-33 91-43 143-22" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity=".82"/>
    <rect x="450" y="522" width="124" height="94" rx="40" fill="url(#blue)"/>
    <rect x="463" y="535" width="98" height="62" rx="28" fill="#e9f7ff"/>
    <circle cx="512" cy="566" r="16" fill="url(#cyan)"/>
    <rect x="468" y="642" width="88" height="18" rx="9" fill="#8ea8c2"/>
  </g>`;

const head = `
  <g id="head">
    <rect x="483" y="264" width="58" height="76" rx="27" fill="#092760"/>
    <rect x="491" y="270" width="42" height="62" rx="20" fill="url(#silver)"/>
    <rect x="396" y="300" width="232" height="190" rx="90" fill="#092760"/>
    <rect x="407" y="311" width="210" height="168" rx="79" fill="url(#white-shell)"/>
    <path d="M432 339c37-27 95-31 140-12" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" opacity=".86"/>
    <rect x="438" y="344" width="148" height="91" rx="42" fill="url(#face)"/>
    <circle cx="479" cy="383" r="12" fill="url(#cyan)"/>
    <circle cx="545" cy="383" r="12" fill="url(#cyan)"/>
    <path d="M477 406c21 20 49 20 70 0" fill="none" stroke="#5cecff" stroke-width="10" stroke-linecap="round"/>
  </g>`;

const crossbar = `
  <g id="crossbar">
    <rect x="169" y="206" width="686" height="88" rx="43" fill="#08265f"/>
    <rect x="179" y="216" width="666" height="68" rx="33" fill="url(#silver)"/>
    <rect x="206" y="226" width="612" height="47" rx="23" fill="url(#blue)"/>
    <path d="M228 237h420" fill="none" stroke="#9bc6ff" stroke-width="8" stroke-linecap="round" opacity=".7"/>
    <circle cx="771" cy="250" r="13" fill="#d8f2ff"/>
  </g>`;

const posts = `
  <g id="posts">
    <rect x="169" y="242" width="108" height="588" rx="52" fill="#08265f"/>
    <rect x="747" y="242" width="108" height="588" rx="52" fill="#08265f"/>
    <rect x="181" y="254" width="84" height="564" rx="40" fill="url(#blue)"/>
    <rect x="759" y="254" width="84" height="564" rx="40" fill="url(#blue)"/>
    <path d="M201 281v429" fill="none" stroke="#83b7ff" stroke-width="11" stroke-linecap="round" opacity=".65"/>
    <path d="M779 281v429" fill="none" stroke="#83b7ff" stroke-width="11" stroke-linecap="round" opacity=".65"/>
    <rect x="194" y="742" width="58" height="54" rx="26" fill="#d5e7f7" opacity=".8"/>
    <rect x="772" y="742" width="58" height="54" rx="26" fill="#d5e7f7" opacity=".8"/>
  </g>`;

const platform = `
  <g id="platform">
    <rect x="123" y="789" width="778" height="112" rx="52" fill="#08265f"/>
    <rect x="133" y="799" width="758" height="92" rx="42" fill="url(#blue)"/>
    <rect x="151" y="810" width="722" height="37" rx="18" fill="url(#silver)"/>
    <rect x="168" y="818" width="688" height="20" rx="10" fill="#eaf5ff"/>
    <path d="M171 861h539" fill="none" stroke="#6fa9ff" stroke-width="10" stroke-linecap="round" opacity=".68"/>
    <circle cx="816" cy="863" r="13" fill="#79edff"/>
  </g>`;

function stageGroups(stage) {
  return [stage >= 6 ? feet : '', stage >= 5 ? arms : '', stage >= 4 ? torso : '',
    stage >= 3 ? head : '', stage >= 2 ? crossbar : '', stage >= 1 ? posts : '', platform].join('');
}

export async function renderModernHangmanStage(stage) {
  assert.ok(Number.isInteger(stage) && stage >= 0 && stage <= 6, 'Modern Hangman stage must be an integer from 0 through 6');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}${stageGroups(stage)}</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}

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
