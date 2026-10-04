/** Shared deterministic Hangman silhouettes, framing, and conditional stage model. */
import assert from 'node:assert/strict';
import sharp from 'sharp';

export const HANGMAN_SOURCE_SIZE = 1024;

const MATERIAL_NAMES = [
  'limbConnector', 'bodyOutline', 'limbSurface', 'feetHighlight', 'armsHighlight',
  'shell', 'shellHighlight', 'accent', 'inset', 'indicator', 'torsoDetail',
  'connectorMetal', 'face', 'eye', 'smile', 'frameOutline', 'frameMetal',
  'frameSurface', 'crossbarHighlight', 'crossbarRivet', 'postsHighlight',
  'postsFoot', 'platformInset', 'platformHighlight', 'platformRivet',
];

function grainPath(path, grain) {
  if (!grain) return '';
  assert.equal(typeof grain.stroke, 'string', 'Hangman grain stroke is required');
  assert.equal(typeof grain.opacity, 'string', 'Hangman grain opacity is required');
  return `\n    <path d="${path}" fill="none" stroke="${grain.stroke}" stroke-width="5" stroke-linecap="round" opacity="${grain.opacity}"/>`;
}

function createGroups(materials, decor) {
  const feet = `
  <g id="feet">
    <rect x="433" y="671" width="52" height="88" rx="25" fill="${materials.limbConnector}"/>
    <rect x="539" y="671" width="52" height="88" rx="25" fill="${materials.limbConnector}"/>
    <rect x="401" y="718" width="108" height="94" rx="45" fill="${materials.bodyOutline}"/>
    <rect x="515" y="718" width="108" height="94" rx="45" fill="${materials.bodyOutline}"/>
    <rect x="410" y="726" width="90" height="70" rx="34" fill="${materials.limbSurface}"/>
    <rect x="524" y="726" width="90" height="70" rx="34" fill="${materials.limbSurface}"/>
    <path d="M427 742c19-14 42-15 59-5" fill="none" stroke="${materials.feetHighlight}" stroke-width="8" stroke-linecap="round" opacity=".72"/>
    <path d="M541 742c19-14 42-15 59-5" fill="none" stroke="${materials.feetHighlight}" stroke-width="8" stroke-linecap="round" opacity=".72"/>
  </g>`;

  const arms = `
  <g id="arms">
    <rect x="332" y="506" width="116" height="136" rx="57" fill="${materials.bodyOutline}"/>
    <rect x="576" y="506" width="116" height="136" rx="57" fill="${materials.bodyOutline}"/>
    <rect x="343" y="516" width="94" height="112" rx="46" fill="${materials.limbSurface}"/>
    <rect x="587" y="516" width="94" height="112" rx="46" fill="${materials.limbSurface}"/>
    <ellipse cx="375" cy="546" rx="18" ry="12" fill="${materials.armsHighlight}" opacity=".74"/>
    <ellipse cx="619" cy="546" rx="18" ry="12" fill="${materials.armsHighlight}" opacity=".74"/>
  </g>`;

  const torso = `
  <g id="torso">
    <rect x="404" y="446" width="216" height="264" rx="84" fill="${materials.bodyOutline}"/>
    <rect x="416" y="458" width="192" height="240" rx="74" fill="${materials.shell}"/>
    <path d="M431 503c33-33 91-43 143-22" fill="none" stroke="${materials.shellHighlight}" stroke-width="14" stroke-linecap="round" opacity=".82"/>
    <rect x="450" y="522" width="124" height="94" rx="40" fill="${materials.accent}"/>
    <rect x="463" y="535" width="98" height="62" rx="28" fill="${materials.inset}"/>
    <circle cx="512" cy="566" r="16" fill="${materials.indicator}"/>
    <rect x="468" y="642" width="88" height="18" rx="9" fill="${materials.torsoDetail}"/>${grainPath('M450 676c30 8 71 8 119-2', decor.torsoGrain)}
  </g>`;

  const head = `
  <g id="head">
    <rect x="483" y="264" width="58" height="76" rx="27" fill="${materials.bodyOutline}"/>
    <rect x="491" y="270" width="42" height="62" rx="20" fill="${materials.connectorMetal}"/>
    <rect x="396" y="300" width="232" height="190" rx="90" fill="${materials.bodyOutline}"/>
    <rect x="407" y="311" width="210" height="168" rx="79" fill="${materials.shell}"/>
    <path d="M432 339c37-27 95-31 140-12" fill="none" stroke="${materials.shellHighlight}" stroke-width="13" stroke-linecap="round" opacity=".86"/>
    <rect x="438" y="344" width="148" height="91" rx="42" fill="${materials.face}"/>
    <circle cx="479" cy="383" r="12" fill="${materials.eye}"/>
    <circle cx="545" cy="383" r="12" fill="${materials.eye}"/>
    <path d="M477 406c21 20 49 20 70 0" fill="none" stroke="${materials.smile}" stroke-width="10" stroke-linecap="round"/>${grainPath('M438 455c35 9 78 8 118-3', decor.headGrain)}
  </g>`;

  const crossbar = `
  <g id="crossbar">
    <rect x="169" y="206" width="686" height="88" rx="43" fill="${materials.frameOutline}"/>
    <rect x="179" y="216" width="666" height="68" rx="33" fill="${materials.frameMetal}"/>
    <rect x="206" y="226" width="612" height="47" rx="23" fill="${materials.frameSurface}"/>
    <path d="M228 237h420" fill="none" stroke="${materials.crossbarHighlight}" stroke-width="8" stroke-linecap="round" opacity=".7"/>
    <circle cx="771" cy="250" r="13" fill="${materials.crossbarRivet}"/>${grainPath('M305 265c72-10 147-7 220 1', decor.crossbarGrain)}
  </g>`;

  const posts = `
  <g id="posts">
    <rect x="169" y="242" width="108" height="588" rx="52" fill="${materials.frameOutline}"/>
    <rect x="747" y="242" width="108" height="588" rx="52" fill="${materials.frameOutline}"/>
    <rect x="181" y="254" width="84" height="564" rx="40" fill="${materials.frameSurface}"/>
    <rect x="759" y="254" width="84" height="564" rx="40" fill="${materials.frameSurface}"/>
    <path d="M201 281v429" fill="none" stroke="${materials.postsHighlight}" stroke-width="11" stroke-linecap="round" opacity=".65"/>
    <path d="M779 281v429" fill="none" stroke="${materials.postsHighlight}" stroke-width="11" stroke-linecap="round" opacity=".65"/>
    <rect x="194" y="742" width="58" height="54" rx="26" fill="${materials.postsFoot}" opacity=".8"/>
    <rect x="772" y="742" width="58" height="54" rx="26" fill="${materials.postsFoot}" opacity=".8"/>${grainPath('M227 355c8 84 5 169-2 252', decor.leftPostGrain)}${grainPath('M797 355c-8 84-5 169 2 252', decor.rightPostGrain)}
  </g>`;

  const platform = `
  <g id="platform">
    <rect x="123" y="789" width="778" height="112" rx="52" fill="${materials.frameOutline}"/>
    <rect x="133" y="799" width="758" height="92" rx="42" fill="${materials.frameSurface}"/>
    <rect x="151" y="810" width="722" height="37" rx="18" fill="${materials.frameMetal}"/>
    <rect x="168" y="818" width="688" height="20" rx="10" fill="${materials.platformInset}"/>
    <path d="M171 861h539" fill="none" stroke="${materials.platformHighlight}" stroke-width="10" stroke-linecap="round" opacity=".68"/>
    <circle cx="816" cy="863" r="13" fill="${materials.platformRivet}"/>${grainPath('M284 879c74-9 150-7 226 1', decor.platformGrain)}
  </g>`;

  return { feet, arms, torso, head, crossbar, posts, platform };
}

export function createHangmanRenderer({ themeName, defs, materials, decor }) {
  assert.equal(typeof themeName, 'string', 'Hangman theme name is required');
  assert.equal(typeof defs, 'string', `${themeName} Hangman definitions are required`);
  assert.equal(typeof materials, 'object', `${themeName} Hangman materials are required`);
  assert.equal(typeof decor, 'object', `${themeName} Hangman decor is required`);
  for (const name of MATERIAL_NAMES) {
    assert.equal(typeof materials[name], 'string', `${themeName} Hangman ${name} material is required`);
  }

  const groups = createGroups(materials, decor);
  const orderedGroups = ['feet', 'arms', 'torso', 'head', 'crossbar', 'posts'];
  return async function renderHangmanStage(stage) {
    assert.ok(Number.isInteger(stage) && stage >= 0 && stage <= 6,
      `${themeName} Hangman stage must be an integer from 0 through 6`);
    const additions = orderedGroups.map((name, index) => stage >= 6 - index ? groups[name] : '').join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}${additions}${groups.platform}</svg>`;
    return sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  };
}
