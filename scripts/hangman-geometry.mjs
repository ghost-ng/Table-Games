/** Shared deterministic Hangman source framing and conditional stage model. */
import assert from 'node:assert/strict';
import sharp from 'sharp';

export const HANGMAN_SOURCE_SIZE = 1024;

export function createHangmanRenderer({ themeName, defs, groups }) {
  const orderedGroups = ['feet', 'arms', 'torso', 'head', 'crossbar', 'posts'];
  for (const name of [...orderedGroups, 'platform']) {
    assert.equal(typeof groups[name], 'string', `${themeName} Hangman ${name} geometry is required`);
  }

  return async function renderHangmanStage(stage) {
    assert.ok(Number.isInteger(stage) && stage >= 0 && stage <= 6,
      `${themeName} Hangman stage must be an integer from 0 through 6`);
    const additions = orderedGroups.map((name, index) => stage >= 6 - index ? groups[name] : '').join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}${additions}${groups.platform}</svg>`;
    return sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  };
}
