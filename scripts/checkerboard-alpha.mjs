/** Strict, opt-in recovery for opaque PNGs flattened onto a neutral checkerboard matte. */
import assert from 'node:assert/strict';
import sharp from 'sharp';

const NEUTRAL_CHROMA = 14;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function colorDistance(a, b) {
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
}

function classify(color, colors, tolerance) {
  if (Math.max(...color) - Math.min(...color) > NEUTRAL_CHROMA) return -1;
  const distances = colors.map((candidate) => colorDistance(color, candidate));
  const index = distances[0] <= distances[1] ? 0 : 1;
  return distances[index] <= tolerance ? index : -1;
}

function analyzeLine(classes) {
  const runs = [];
  let previous = -2; let length = 0;
  for (const value of classes) {
    if (value < 0) {
      if (length) runs.push(length);
      previous = -2; length = 0;
    } else if (value === previous) {
      length++;
    } else {
      if (length) runs.push(length);
      previous = value; length = 1;
    }
  }
  if (length) runs.push(length);
  if (runs.length < 8) return null;
  const interior = runs.length > 2 ? runs.slice(1, -1) : runs;
  const cellSize = median(interior);
  const stable = interior.filter((size) => size >= cellSize * 0.55 && size <= cellSize * 1.45);
  return { cellSize, agreement: stable.reduce((sum, size) => sum + size, 0)
    / interior.reduce((sum, size) => sum + size, 0), runs: runs.length };
}

function inferMatte(data, width, height, channels) {
  const band = Math.max(2, Math.min(12, Math.floor(Math.min(width, height) / 16)));
  const samples = [];
  const add = (x, y) => {
    const offset = (y * width + x) * channels;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let inset = 0; inset < band; inset++) {
    for (let x = inset; x < width - inset; x++) {
      add(x, inset); add(x, height - inset - 1);
    }
    for (let y = inset + 1; y < height - inset - 1; y++) {
      add(inset, y); add(width - inset - 1, y);
    }
  }
  const neutral = samples.filter((color) => Math.max(...color) - Math.min(...color) <= NEUTRAL_CHROMA);
  assert.ok(neutral.length / samples.length >= 0.85,
    'Checkerboard recovery refused: non-neutral foreground or pattern reaches the canvas border');
  const luminances = neutral.map((color) => (color[0] + color[1] + color[2]) / 3);
  let centers = [Math.min(...luminances), Math.max(...luminances)];
  for (let iteration = 0; iteration < 12; iteration++) {
    const sums = [0, 0]; const counts = [0, 0];
    for (const value of luminances) {
      const cluster = Math.abs(value - centers[0]) <= Math.abs(value - centers[1]) ? 0 : 1;
      sums[cluster] += value; counts[cluster]++;
    }
    assert.ok(counts.every((count) => count >= neutral.length * 0.15),
      'Checkerboard recovery refused: two strongly covered matte tones are required');
    centers = sums.map((sum, index) => sum / counts[index]);
  }
  centers.sort((a, b) => a - b);
  const separation = centers[1] - centers[0];
  assert.ok(separation >= 24 && separation <= 100,
    'Checkerboard recovery refused: two distinct neutral matte tones are required');
  const groups = [[], []];
  for (const color of neutral) {
    const value = (color[0] + color[1] + color[2]) / 3;
    groups[Math.abs(value - centers[0]) <= Math.abs(value - centers[1]) ? 0 : 1].push(color);
  }
  const colors = groups.map((group) => [0, 1, 2].map((channel) =>
    Math.round(group.reduce((sum, color) => sum + color[channel], 0) / group.length)));
  const tolerance = Math.max(8, Math.min(28, Math.round(separation * 0.42)));
  const at = (x, y) => {
    const offset = (y * width + x) * channels;
    return classify([data[offset], data[offset + 1], data[offset + 2]], colors, tolerance);
  };
  const horizontal = []; const vertical = [];
  for (let inset = 0; inset < band; inset++) {
    horizontal.push(analyzeLine(Array.from({ length: width }, (_, x) => at(x, inset))));
    horizontal.push(analyzeLine(Array.from({ length: width }, (_, x) => at(x, height - inset - 1))));
    vertical.push(analyzeLine(Array.from({ length: height }, (_, y) => at(inset, y))));
    vertical.push(analyzeLine(Array.from({ length: height }, (_, y) => at(width - inset - 1, y))));
  }
  const bestHorizontal = horizontal.filter(Boolean).sort((a, b) => b.agreement - a.agreement)[0];
  const bestVertical = vertical.filter(Boolean).sort((a, b) => b.agreement - a.agreement)[0];
  assert.ok(bestHorizontal && bestVertical && bestHorizontal.agreement >= 0.78 && bestVertical.agreement >= 0.78,
    'Checkerboard recovery refused: regular repeated spatial alternation was not detected');
  assert.ok(Math.abs(bestHorizontal.cellSize - bestVertical.cellSize)
    <= Math.max(2, Math.max(bestHorizontal.cellSize, bestVertical.cellSize) * 0.35),
  'Checkerboard recovery refused: horizontal and vertical checker periods disagree');
  const cellSize = Math.round((bestHorizontal.cellSize + bestVertical.cellSize) / 2);
  const periodicAgreement = Math.min(bestHorizontal.agreement, bestVertical.agreement);
  const gridSamples = [];
  const sampleStep = Math.max(1, Math.floor(cellSize / 2));
  for (let x = 0; x < width; x += sampleStep) {
    gridSamples.push([x, 0], [x, height - 1]);
  }
  for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
    gridSamples.push([0, y], [width - 1, y]);
  }
  let grid = { agreement: 0, phaseX: 0, phaseY: 0, origin: 0 };
  for (let phaseX = 0; phaseX < cellSize; phaseX++) for (let phaseY = 0; phaseY < cellSize; phaseY++) {
    for (let origin = 0; origin < 2; origin++) {
      let matches = 0; let compared = 0;
      for (const [x, y] of gridSamples) {
        const actual = at(x, y);
        if (actual < 0) continue;
        const expected = (Math.floor((x + phaseX) / cellSize)
          + Math.floor((y + phaseY) / cellSize) + origin) % 2;
        matches += actual === expected ? 1 : 0;
        compared++;
      }
      const agreement = compared ? matches / compared : 0;
      if (agreement > grid.agreement) grid = { agreement, phaseX, phaseY, origin };
    }
  }
  assert.ok(grid.agreement >= 0.57,
    `Checkerboard recovery refused: neutral tones do not share a stable global grid phase (${grid.agreement.toFixed(4)})`);
  return { colors, tolerance, cellSize, periodicAgreement, classify: at,
    gridPhase: { x: grid.phaseX, y: grid.phaseY, origin: grid.origin },
    globalGridAgreement: grid.agreement };
}

function minimalAlpha(color, background) {
  let alpha = 0;
  for (let channel = 0; channel < 3; channel++) {
    const value = color[channel]; const matte = background[channel];
    const required = value < matte ? (matte - value) / Math.max(1, matte)
      : (value - matte) / Math.max(1, 255 - matte);
    alpha = Math.max(alpha, required);
  }
  return Math.min(1, Math.max(0, alpha));
}

/**
 * Recover genuine alpha only after proving an opaque image has a regular,
 * two-neutral-tone checkerboard matte. The returned PNG is never written here.
 */
export async function recoverCheckerboardAlpha(input, { allowTransparentNoop = false } = {}) {
  const image = sharp(input, { failOn: 'error' });
  const metadata = await image.metadata();
  assert.equal(metadata.format, 'png', 'Checkerboard recovery accepts PNG input only');
  const decoded = await image.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = decoded; const { width, height, channels } = info;
  const hasTransparency = metadata.hasAlpha === true
    && Array.from({ length: width * height }, (_, pixel) => data[pixel * channels + 3]).some((alpha) => alpha < 255);
  if (hasTransparency) {
    assert.ok(allowTransparentNoop, 'Checkerboard recovery refused: input is already transparent/has alpha');
    return { data: Buffer.isBuffer(input) ? input : await sharp(input).png().toBuffer(),
      detection: null, removedPixels: 0, metrics: null, noop: true };
  }
  const matte = inferMatte(data, width, height, channels);
  const isMatte = (x, y) => matte.classify(x, y) >= 0;
  const borderTransitions = new Uint8Array(width * height);
  const borderLimit = Math.max(4, Math.round(matte.cellSize * 1.75));
  const colorAt = (pixel) => {
    const offset = pixel * channels;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };
  const isNeutralTransition = (pixel) => {
    const color = colorAt(pixel);
    if (Math.max(...color) - Math.min(...color) > NEUTRAL_CHROMA) return false;
    const luminance = (color[0] + color[1] + color[2]) / 3;
    const levels = matte.colors.map((candidateColor) => candidateColor.reduce((sum, value) => sum + value, 0) / 3);
    return luminance >= Math.min(...levels) - matte.tolerance && luminance <= Math.max(...levels) + matte.tolerance;
  };
  const borderLines = [
    Array.from({ length: width }, (_, x) => x),
    Array.from({ length: width }, (_, x) => (height - 1) * width + x),
    Array.from({ length: height }, (_, y) => y * width),
    Array.from({ length: height }, (_, y) => y * width + width - 1),
  ];
  for (const line of borderLines) {
    let run = [];
    const flush = () => {
      if (!run.length) return;
      assert.ok(run.length < borderLimit && run.every(isNeutralTransition),
        'Checkerboard recovery refused: foreground touches the canvas border');
      for (const pixel of run) borderTransitions[pixel] = 1;
      run = [];
    };
    for (const pixel of line) {
      const x = pixel % width; const y = Math.floor(pixel / width);
      if (isMatte(x, y)) flush(); else run.push(pixel);
    }
    flush();
  }
  const candidate = new Uint8Array(width * height);
  let mattePixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pixel = y * width + x;
    if (isMatte(x, y) || borderTransitions[pixel]) { candidate[pixel] = 1; mattePixels++; }
  }
  // Bridge only narrow neutral seams bracketed by verified matte on opposite
  // sides. One-sided neutral pixels stay foreground, preserving silver edges.
  const bridgeRadius = Math.max(1, Math.floor(matte.cellSize / 3));
  for (let pass = 0; pass < 2; pass++) {
    const additions = [];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const pixel = y * width + x;
      if (candidate[pixel] || !isNeutralTransition(pixel)) continue;
      let left = false; let right = false; let up = false; let down = false;
      for (let distance = 1; distance <= bridgeRadius; distance++) {
        if (x >= distance) left ||= candidate[pixel - distance] === 1;
        if (x + distance < width) right ||= candidate[pixel + distance] === 1;
        if (y >= distance) up ||= candidate[pixel - distance * width] === 1;
        if (y + distance < height) down ||= candidate[pixel + distance * width] === 1;
      }
      if ((left && right) || (up && down)) additions.push(pixel);
    }
    if (!additions.length) break;
    for (const pixel of additions) {
      candidate[pixel] = 1;
      mattePixels++;
    }
  }
  assert.ok(mattePixels >= width * height * 0.25,
    'Checkerboard recovery refused: verified matte coverage is too weak');
  const removed = new Uint8Array(width * height); const queue = new Int32Array(width * height);
  let head = 0; let tail = 0;
  const seed = (pixel) => {
    if (candidate[pixel] && !removed[pixel]) { removed[pixel] = 1; queue[tail++] = pixel; }
  };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { seed(y * width); seed(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++]; const x = pixel % width; const y = Math.floor(pixel / width);
    if (x) seed(pixel - 1); if (x + 1 < width) seed(pixel + 1);
    if (y) seed(pixel - width); if (y + 1 < height) seed(pixel + width);
  }
  let removedPixels = tail;
  const seen = removed.slice();
  const rejectedComponents = [];
  for (let seedPixel = 0; seedPixel < candidate.length; seedPixel++) {
    if (!candidate[seedPixel] || seen[seedPixel]) continue;
    const componentStart = tail; let componentHead = tail;
    queue[tail++] = seedPixel; seen[seedPixel] = 1;
    while (componentHead < tail) {
      const pixel = queue[componentHead++]; const x = pixel % width; const y = Math.floor(pixel / width);
      for (const neighbor of [x ? pixel - 1 : -1, x + 1 < width ? pixel + 1 : -1,
        y ? pixel - width : -1, y + 1 < height ? pixel + width : -1]) {
        if (neighbor >= 0 && candidate[neighbor] && !seen[neighbor]) {
          seen[neighbor] = 1; queue[tail++] = neighbor;
        }
      }
    }
    const component = queue.subarray(componentStart, tail);
    const tones = [0, 0]; let sampled = 0; let classified = 0;
    const phaseSamples = [];
    let neighborMatches = 0; let neighborComparisons = 0;
    const spacing = matte.cellSize;
    for (let index = 0; index < component.length; index += Math.max(1, Math.floor(component.length / 4000))) {
      const pixel = component[index]; const x = pixel % width; const y = Math.floor(pixel / width);
      sampled++;
      const actual = matte.classify(x, y);
      if (actual < 0) continue;
      classified++; tones[actual]++;
      phaseSamples.push([x, y, actual]);
      for (const [dx, dy] of [[spacing, 0], [-spacing, 0], [0, spacing], [0, -spacing]]) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighbor = ny * width + nx; const neighborTone = matte.classify(nx, ny);
        if (!candidate[neighbor] || neighborTone < 0) continue;
        neighborComparisons++;
        neighborMatches += neighborTone === 1 - actual ? 1 : 0;
      }
    }
    let phaseAgreement = 0;
    const phaseTolerance = Math.max(1, Math.floor(spacing / 3));
    for (let shiftX = -phaseTolerance; shiftX <= phaseTolerance; shiftX++) {
      for (let shiftY = -phaseTolerance; shiftY <= phaseTolerance; shiftY++) {
        let matches = 0;
        for (const [x, y, actual] of phaseSamples) {
          const expected = (Math.floor((x + matte.gridPhase.x + shiftX) / spacing)
            + Math.floor((y + matte.gridPhase.y + shiftY) / spacing) + matte.gridPhase.origin) % 2;
          matches += actual === expected ? 1 : 0;
        }
        phaseAgreement = Math.max(phaseAgreement, phaseSamples.length ? matches / phaseSamples.length : 0);
      }
    }
    const localPeriodicAgreement = neighborComparisons ? neighborMatches / neighborComparisons : 0;
    const toneBalance = classified ? Math.min(...tones) / classified : 0;
    const backgroundLike = component.length >= width * height * 0.05
      && classified >= sampled * 0.55
      && toneBalance >= 0.25
      && neighborComparisons >= 8
      && localPeriodicAgreement >= 0.90;
    const sameGlobalPhase = phaseAgreement >= Math.max(0.55, matte.globalGridAgreement - 0.08);
    const sameGrid = component.length >= spacing * spacing
      && classified >= sampled * 0.55
      && toneBalance >= 0.15
      && neighborComparisons >= 8
      && localPeriodicAgreement >= 0.55
      && (sameGlobalPhase || backgroundLike);
    if (sameGrid) {
      for (const pixel of component) removed[pixel] = 1;
      removedPixels += component.length;
    } else {
      rejectedComponents.push({ pixels: component.length, classified: classified / Math.max(1, sampled),
        toneBalance, phaseAgreement, localPeriodicAgreement, neighborComparisons });
    }
  }
  rejectedComponents.sort((a, b) => b.pixels - a.pixels);
  assert.ok(removedPixels >= mattePixels * 0.90,
    `Checkerboard recovery refused: unmatched enclosed regions do not continue the verified checker grid (${removedPixels}/${mattePixels} pixels; largest ${JSON.stringify(rejectedComponents[0] ?? null)})`);
  for (let pixel = 0; pixel < removed.length; pixel++) {
    if (removed[pixel]) data[pixel * channels + 3] = 0;
  }
  // Unmatte a single antialiased fringe. Neutral foreground remains opaque
  // because neutral tones cannot be distinguished safely from silver/white/black.
  for (let pixel = 0; pixel < removed.length; pixel++) {
    if (removed[pixel]) continue;
    const x = pixel % width; const y = Math.floor(pixel / width);
    let adjacent = false;
    for (let dy = -1; dy <= 1 && !adjacent; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      if (removed[(y + dy) * width + x + dx]) { adjacent = true; break; }
    }
    if (!adjacent) continue;
    const offset = pixel * channels;
    const color = [data[offset], data[offset + 1], data[offset + 2]];
    if (Math.max(...color) - Math.min(...color) <= NEUTRAL_CHROMA) continue;
    const background = matte.colors.reduce((best, candidateColor) =>
      colorDistance(color, candidateColor) < colorDistance(color, best) ? candidateColor : best);
    const alpha = minimalAlpha(color, background);
    if (alpha >= 0.98) continue;
    data[offset + 3] = Math.max(1, Math.round(alpha * 255));
    for (let channel = 0; channel < 3; channel++) {
      data[offset + channel] = Math.max(0, Math.min(255,
        Math.round((color[channel] - (1 - alpha) * background[channel]) / Math.max(alpha, 1 / 255))));
    }
  }
  const output = await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toBuffer();
  const metrics = await (await import('./game-art-lib.mjs')).readImageMetrics(output);
  assert.ok(metrics.bounds && metrics.transparentCorners && !metrics.edgeTouching,
    'Checkerboard recovery refused: recovered foreground is empty or touches the canvas edge');
  return { data: output, detection: { colors: matte.colors, cellSize: matte.cellSize,
    periodicAgreement: matte.periodicAgreement, globalGridAgreement: matte.globalGridAgreement,
    gridPhase: matte.gridPhase, matteCoverage: mattePixels / (width * height) },
  removedPixels, metrics, noop: false };
}
