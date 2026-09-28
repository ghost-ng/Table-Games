/** Strict, opt-in recovery for opaque PNGs flattened onto a neutral checkerboard matte. */
import assert from 'node:assert/strict';
import sharp from 'sharp';

const NEUTRAL_CHROMA = 14;
export const MAX_CHECKERBOARD_DIMENSION = 4096;
export const MAX_CHECKERBOARD_PIXELS = 4_000_000;
export const MAX_CHECKERBOARD_CELL_SIZE = 64;

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
  const coreTolerance = Math.min(6, tolerance);
  const atCore = (x, y) => {
    const offset = (y * width + x) * channels;
    return classify([data[offset], data[offset + 1], data[offset + 2]], colors, coreTolerance);
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
  assert.ok(cellSize <= MAX_CHECKERBOARD_CELL_SIZE,
    `Checkerboard recovery refused: maximum checker cell size is ${MAX_CHECKERBOARD_CELL_SIZE}px`);
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
  return { colors, tolerance, coreTolerance, cellSize, periodicAgreement, classify: at, classifyCore: atCore,
    gridPhase: { x: grid.phaseX, y: grid.phaseY, origin: grid.origin },
    globalGridAgreement: grid.agreement };
}

function solveComposite(color, background, foreground) {
  const contrast = foreground.map((value, channel) => value - background[channel]);
  if (Math.max(...contrast.map(Math.abs)) < 10) return null;
  const denominator = contrast.reduce((sum, value) => sum + value * value, 0);
  if (denominator < 100) return null;
  const alpha = color.reduce((sum, value, channel) =>
    sum + (value - background[channel]) * contrast[channel], 0) / denominator;
  if (alpha <= 0.02 || alpha >= 0.98) return null;
  const residual = Math.sqrt(color.reduce((sum, value, channel) => {
    const predicted = alpha * foreground[channel] + (1 - alpha) * background[channel];
    return sum + (value - predicted) ** 2;
  }, 0) / 3);
  if (residual > 2.5) return null;
  const recovered = color.map((value, channel) => Math.max(0, Math.min(255,
    Math.round((value - (1 - alpha) * background[channel]) / alpha))));
  if (colorDistance(recovered, foreground) > 8) return null;
  return { alpha, foreground: recovered, residual };
}

/**
 * Recover genuine alpha only after proving an opaque image has a regular,
 * two-neutral-tone checkerboard matte. The returned PNG is never written here.
 */
export async function recoverCheckerboardAlpha(input, { allowTransparentNoop = false } = {}) {
  const image = sharp(input, { failOn: 'error' });
  const metadata = await image.metadata();
  assert.equal(metadata.format, 'png', 'Checkerboard recovery accepts PNG input only');
  assert.ok(metadata.width && metadata.height
    && metadata.width <= MAX_CHECKERBOARD_DIMENSION && metadata.height <= MAX_CHECKERBOARD_DIMENSION,
  `Checkerboard recovery refused: maximum dimension is ${MAX_CHECKERBOARD_DIMENSION}px`);
  assert.ok(metadata.width * metadata.height <= MAX_CHECKERBOARD_PIXELS,
    `Checkerboard recovery refused: maximum pixel count is ${MAX_CHECKERBOARD_PIXELS}`);
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
  const isMatte = (x, y) => {
    const tone = matte.classify(x, y);
    if (tone < 0) return false;
    if (matte.classifyCore(x, y) < 0) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const offset = ((y + dy) * width + x + dx) * channels;
        const neighbor = [data[offset], data[offset + 1], data[offset + 2]];
        if (Math.max(...neighbor) - Math.min(...neighbor) > NEUTRAL_CHROMA) return false;
      }
    }
    let comparisons = 0; let matches = 0;
    for (const [dx, dy] of [[matte.cellSize, 0], [-matte.cellSize, 0],
      [0, matte.cellSize], [0, -matte.cellSize]]) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighborTone = matte.classify(nx, ny);
      if (neighborTone < 0) continue;
      comparisons++;
      matches += neighborTone === 1 - tone ? 1 : 0;
    }
    return comparisons >= 2 && matches / comparisons >= 2 / 3;
  };
  const borderTransitions = new Uint8Array(width * height);
  const borderLimit = Math.max(4, Math.round(matte.cellSize * 1.75));
  const colorAt = (pixel) => {
    const offset = pixel * channels;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };
  const protectedNeutral = new Uint8Array(width * height);
  const protectionQueue = new Int32Array(width * height);
  let protectionHead = 0; let protectionTail = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (matte.classify(x, y) < 0 || matte.classifyCore(x, y) >= 0) continue;
    let touchesChromatic = false;
    for (let dy = -1; dy <= 1 && !touchesChromatic; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      const neighbor = colorAt((y + dy) * width + x + dx);
      if (Math.max(...neighbor) - Math.min(...neighbor) > NEUTRAL_CHROMA) { touchesChromatic = true; break; }
    }
    if (!touchesChromatic) continue;
    const pixel = y * width + x;
    protectedNeutral[pixel] = 1; protectionQueue[protectionTail++] = pixel;
  }
  while (protectionHead < protectionTail) {
    const pixel = protectionQueue[protectionHead++]; const x = pixel % width; const y = Math.floor(pixel / width);
    for (const neighbor of [x ? pixel - 1 : -1, x + 1 < width ? pixel + 1 : -1,
      y ? pixel - width : -1, y + 1 < height ? pixel + width : -1]) {
      if (neighbor < 0 || protectedNeutral[neighbor]) continue;
      const nx = neighbor % width; const ny = Math.floor(neighbor / width);
      if (matte.classify(nx, ny) < 0 || colorDistance(colorAt(neighbor), colorAt(pixel)) > 4) continue;
      protectedNeutral[neighbor] = 1; protectionQueue[protectionTail++] = neighbor;
    }
  }
  const solidNeutral = new Uint8Array(width * height);
  const protectionSeen = new Uint8Array(width * height);
  const componentQueue = new Int32Array(width * height);
  for (let seedPixel = 0; seedPixel < protectedNeutral.length; seedPixel++) {
    if (!protectedNeutral[seedPixel] || protectionSeen[seedPixel]) continue;
    let componentHead = 0; let componentTail = 0;
    let minX = seedPixel % width; let maxX = minX;
    let minY = Math.floor(seedPixel / width); let maxY = minY;
    componentQueue[componentTail++] = seedPixel; protectionSeen[seedPixel] = 1;
    while (componentHead < componentTail) {
      const pixel = componentQueue[componentHead++]; const x = pixel % width; const y = Math.floor(pixel / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const neighbor of [x ? pixel - 1 : -1, x + 1 < width ? pixel + 1 : -1,
        y ? pixel - width : -1, y + 1 < height ? pixel + width : -1]) {
        if (neighbor < 0 || !protectedNeutral[neighbor] || protectionSeen[neighbor]) continue;
        protectionSeen[neighbor] = 1; componentQueue[componentTail++] = neighbor;
      }
    }
    const compactness = componentTail / ((maxX - minX + 1) * (maxY - minY + 1));
    if (componentTail >= matte.cellSize * matte.cellSize && compactness >= 0.5) {
      for (let index = 0; index < componentTail; index++) solidNeutral[componentQueue[index]] = 1;
    }
  }
  const isBorderMatte = (x, y) => {
    if (protectedNeutral[y * width + x]) return false;
    if (isMatte(x, y)) return true;
    if (matte.classify(x, y) < 0) return false;
    const inward = [];
    if (x === 0) inward.push([1, 0]);
    if (x === width - 1) inward.push([-1, 0]);
    if (y === 0) inward.push([0, 1]);
    if (y === height - 1) inward.push([0, -1]);
    for (const [dx, dy] of inward) {
      for (let distance = 1; distance <= matte.cellSize * 2; distance++) {
        if (isMatte(x + dx * distance, y + dy * distance)) return true;
      }
    }
    return false;
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
      if (isBorderMatte(x, y)) {
        borderTransitions[pixel] = 1;
        flush();
      } else run.push(pixel);
    }
    flush();
  }
  const candidate = new Uint8Array(width * height);
  let mattePixels = 0; let verifiedPixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pixel = y * width + x;
    const borderTransition = borderTransitions[pixel] === 1;
    if (matte.classify(x, y) >= 0 || borderTransition) mattePixels++;
    if ((isMatte(x, y) && !protectedNeutral[pixel]) || borderTransition) {
      candidate[pixel] = 1; verifiedPixels++;
    }
  }
  // Bridge only narrow neutral seams bracketed by verified matte on opposite
  // sides. One-sided neutral pixels stay foreground, preserving silver edges.
  const bridgeRadius = Math.max(1, Math.floor(matte.cellSize / 3));
  for (let pass = 0; pass < 2; pass++) {
    const additions = [];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const pixel = y * width + x;
      if (candidate[pixel] || !isNeutralTransition(pixel)) continue;
      const touchesChromaticForeground = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) =>
        (dx || dy) && Math.max(...colorAt(pixel + dy * width + dx))
          - Math.min(...colorAt(pixel + dy * width + dx)) > NEUTRAL_CHROMA));
      if (touchesChromaticForeground) continue;
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
      verifiedPixels++;
    }
  }
  assert.ok(verifiedPixels >= width * height * 0.25,
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
  // Only unmatte boundary pixels that can be explained by the verified grid
  // tone and a stable, nearby opaque foreground seed.
  const seedRadius = Math.max(3, Math.min(8, matte.cellSize));
  const backgroundAt = (x, y) => matte.colors[(Math.floor((x + matte.gridPhase.x) / matte.cellSize)
    + Math.floor((y + matte.gridPhase.y) / matte.cellSize) + matte.gridPhase.origin) % 2];
  const stableSeeds = (x, y) => {
    const seeds = [];
    for (let distance = 1; distance <= seedRadius; distance++) {
      for (let sy = Math.max(0, y - distance); sy <= Math.min(height - 1, y + distance); sy++) {
        for (let sx = Math.max(0, x - distance); sx <= Math.min(width - 1, x + distance); sx++) {
          if (Math.max(Math.abs(sx - x), Math.abs(sy - y)) !== distance) continue;
          const seedPixel = sy * width + sx;
          if (removed[seedPixel] || data[seedPixel * channels + 3] !== 255) continue;
          if (matte.classifyCore(sx, sy) >= 0 && !protectedNeutral[seedPixel]) continue;
          const seedColor = colorAt(seedPixel);
          let support = 0; let touchesMatte = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if ((!dx && !dy) || sx + dx < 0 || sx + dx >= width || sy + dy < 0 || sy + dy >= height) continue;
            const neighbor = (sy + dy) * width + sx + dx;
            touchesMatte ||= removed[neighbor] === 1;
            if (!removed[neighbor] && colorDistance(colorAt(neighbor), seedColor) <= 4) support++;
          }
          const supportedNeutralEdge = protectedNeutral[seedPixel] && support >= 2;
          if ((!touchesMatte || supportedNeutralEdge) && support >= 2) seeds.push({ color: seedColor, distance });
        }
      }
      if (seeds.length) break;
    }
    return seeds;
  };
  for (let pixel = 0; pixel < removed.length; pixel++) {
    const x = pixel % width; const y = Math.floor(pixel / width);
    let touchesRemoved = false; let touchesForeground = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      if (removed[(y + dy) * width + x + dx]) touchesRemoved = true;
      else touchesForeground = true;
    }
    if (removed[pixel] && !touchesForeground) {
      const frontierRadius = Math.min(3, seedRadius);
      for (let dy = -frontierRadius; dy <= frontierRadius && !touchesForeground; dy++) {
        for (let dx = -frontierRadius; dx <= frontierRadius; dx++) {
          if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
          if (!removed[(y + dy) * width + x + dx]) { touchesForeground = true; break; }
        }
      }
    }
    if (removed[pixel] ? !touchesForeground : !touchesRemoved) continue;
    if (!removed[pixel] && solidNeutral[pixel]) continue;
    const offset = pixel * channels;
    const color = [data[offset], data[offset + 1], data[offset + 2]];
    const background = backgroundAt(x, y);
    let best = null;
    for (const seed of stableSeeds(x, y)) {
      const solved = solveComposite(color, background, seed.color);
      if (!solved) continue;
      const score = solved.residual + seed.distance / 100;
      if (!best || score < best.score) best = { ...solved, score };
    }
    if (!best) continue;
    if (removed[pixel]) { removed[pixel] = 0; removedPixels--; }
    data[offset + 3] = Math.max(1, Math.min(254, Math.round(best.alpha * 255)));
    for (let channel = 0; channel < 3; channel++) {
      data[offset + channel] = best.foreground[channel];
    }
  }
  const output = await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toBuffer();
  const edgeAlphas = [];
  for (let x = 0; x < width; x++) {
    edgeAlphas.push(data[x * channels + 3], data[((height - 1) * width + x) * channels + 3]);
  }
  for (let y = 1; y < height - 1; y++) {
    edgeAlphas.push(data[(y * width) * channels + 3], data[(y * width + width - 1) * channels + 3]);
  }
  let prepared;
  try {
    prepared = await (await import('./game-art-lib.mjs')).prepareGameArtSource(output);
  } catch (error) {
    const visibleEdgeAlphas = edgeAlphas.filter((alpha) => alpha > 0);
    error.message += ` (pre-sanitization edge alpha: ${visibleEdgeAlphas.length} pixels, max ${Math.max(0, ...visibleEdgeAlphas)}/255)`;
    throw error;
  }
  removedPixels += prepared.removedPixels;
  return { data: prepared.input, detection: { colors: matte.colors, cellSize: matte.cellSize,
    periodicAgreement: matte.periodicAgreement, globalGridAgreement: matte.globalGridAgreement,
    gridPhase: matte.gridPhase, matteCoverage: mattePixels / (width * height),
    sanitizedPixels: prepared.removedPixels },
  removedPixels, metrics: prepared.metrics, noop: false };
}
