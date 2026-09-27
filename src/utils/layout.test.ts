import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateBoardSize, calculateGridBoardLayout, resolveBoardInset, type CalculateBoardSizeOptions } from './boardSizing';

// Literal expectations catch duplicate portrait gutters, lost height constraints,
// incorrect aspect-ratio handling, ignored caps/floors, and fractional widths.
const cases: { name: string; options: CalculateBoardSizeOptions; expected: number }[] = [
  {
    name: '296px portrait-phone area fills its width with the resolved zero inset',
    options: { areaWidth: 296, areaHeight: 600, maxSize: 560, minSize: 200, inset: 0, aspectRatio: 1, extraHeight: 0 },
    expected: 296,
  },
  {
    name: '366px portrait-phone area fills its width with the resolved zero inset',
    options: { areaWidth: 366, areaHeight: 600, maxSize: 560, minSize: 200, inset: 0, aspectRatio: 1, extraHeight: 0 },
    expected: 366,
  },
  {
    name: '406px portrait-phone area fills its width with the resolved zero inset',
    options: { areaWidth: 406, areaHeight: 600, maxSize: 560, minSize: 200, inset: 0, aspectRatio: 1, extraHeight: 0 },
    expected: 406,
  },
  {
    name: 'desktop area remains capped at the configured maximum',
    options: { areaWidth: 1120, areaHeight: 900, maxSize: 560, minSize: 200, inset: 16, aspectRatio: 1, extraHeight: 0 },
    expected: 560,
  },
  {
    name: 'compact landscape remains height-bound with its existing inset',
    options: { areaWidth: 600, areaHeight: 240, maxSize: 560, minSize: 132, inset: 24, aspectRatio: 1, extraHeight: 0 },
    expected: 192,
  },
  {
    name: 'height constraint accounts for the board aspect ratio and stacked content',
    options: { areaWidth: 700, areaHeight: 360, maxSize: 640, minSize: 160, inset: 8, aspectRatio: 0.8, extraHeight: 48 },
    expected: 370,
  },
  {
    name: 'portrait height constraint remains authoritative with zero inset',
    options: { areaWidth: 406, areaHeight: 300, maxSize: 560, minSize: 200, inset: 0, aspectRatio: 1, extraHeight: 0 },
    expected: 300,
  },
  {
    name: 'fractional board sizes are floored to integer pixels',
    options: { areaWidth: 366.75, areaHeight: 600, maxSize: 560, minSize: 200, inset: 0, aspectRatio: 1, extraHeight: 0 },
    expected: 366,
  },
  {
    name: 'tiny measured areas preserve the configured minimum width',
    options: { areaWidth: 40, areaHeight: 32, maxSize: 560, minSize: 138, inset: 8, aspectRatio: 1, extraHeight: 0 },
    expected: 138,
  },
  {
    name: 'a custom portrait phone inset keeps its requested breathing room',
    options: { areaWidth: 366, areaHeight: 600, maxSize: 560, minSize: 200, inset: 6, aspectRatio: 1, extraHeight: 0 },
    expected: 354,
  },
];

for (const { name, options, expected } of cases) {
  test(name, () => {
    assert.equal(calculateBoardSize(options), expected);
  });
}

test('portrait phones default to zero inset', () => {
  assert.equal(resolveBoardInset({ inset: 16, isPhone: true, isLandscape: false }), 0);
});

test('portrait phones honor a configured phone inset', () => {
  assert.equal(resolveBoardInset({ inset: 16, phoneInset: 6, isPhone: true, isLandscape: false }), 6);
});

test('landscape phones retain the existing inset even with a phone override', () => {
  assert.equal(resolveBoardInset({ inset: 24, phoneInset: 0, isPhone: true, isLandscape: true }), 24);
});

test('portrait tablets retain the existing inset even with a phone override', () => {
  assert.equal(resolveBoardInset({ inset: 16, phoneInset: 0, isPhone: false, isLandscape: false }), 16);
});

test('portrait phone inset resolution fills a measured area through the sizing calculation', () => {
  const inset = resolveBoardInset({ inset: 16, phoneInset: 0, isPhone: true, isLandscape: false });
  assert.equal(calculateBoardSize({
    areaWidth: 366, areaHeight: 600, maxSize: 560, minSize: 200, inset, aspectRatio: 1, extraHeight: 0,
  }), 366);
});

const gridCases = [
  {
    name: 'Crossword fills a 390x900 portrait shell with its real 6px chrome',
    options: { areaWidth: 366, heightLimit: 396, maxSize: 400, isPhone: true, isLandscape: false, columns: 9, padding: 1, borderWidth: 2, gap: 0 },
    boardWidth: 366, cellSize: 40,
  },
  {
    name: 'Crossword fills a 430x1000 portrait shell beyond the old phone cap',
    options: { areaWidth: 406, heightLimit: 440, maxSize: 400, isPhone: true, isLandscape: false, columns: 9, padding: 1, borderWidth: 2, gap: 0 },
    boardWidth: 406, cellSize: 44.44444444444444,
  },
  {
    name: 'Word Search fills a 390x900 portrait shell with its real 6px chrome',
    options: { areaWidth: 366, heightLimit: 540, maxSize: 400, isPhone: true, isLandscape: false, columns: 10, padding: 2, borderWidth: 1, gap: 0 },
    boardWidth: 366, cellSize: 36,
  },
  {
    name: 'Word Search fills a 430x1000 portrait shell beyond the old phone cap',
    options: { areaWidth: 406, heightLimit: 600, maxSize: 400, isPhone: true, isLandscape: false, columns: 10, padding: 2, borderWidth: 1, gap: 0 },
    boardWidth: 406, cellSize: 40,
  },
  {
    name: 'Word Grid fills a 390x900 portrait shell without border overflow',
    options: { areaWidth: 366, heightLimit: 495, maxSize: 400, isPhone: true, isLandscape: false, columns: 4, padding: 12, borderWidth: 1, gap: 8 },
    boardWidth: 366, cellSize: 79,
  },
  {
    name: 'Word Grid fills a 430x1000 portrait shell beyond the old phone cap',
    options: { areaWidth: 406, heightLimit: 550, maxSize: 400, isPhone: true, isLandscape: false, columns: 4, padding: 12, borderWidth: 1, gap: 8 },
    boardWidth: 406, cellSize: 89,
  },
  {
    name: 'Crossword retains an authoritative height cap at 430x900',
    options: { areaWidth: 406, heightLimit: 396, maxSize: 400, isPhone: true, isLandscape: false, columns: 9, padding: 1, borderWidth: 2, gap: 0 },
    boardWidth: 396, cellSize: 43.333333333333336,
  },
  {
    name: 'Crossword retains its compact portrait height cap',
    options: { areaWidth: 366, heightLimit: 200, maxSize: 400, isPhone: true, isLandscape: false, columns: 9, padding: 1, borderWidth: 2, gap: 0 },
    boardWidth: 200, cellSize: 21.555555555555557,
  },
  {
    name: 'Word Search retains its 220px short-landscape cap',
    options: { areaWidth: 576, heightLimit: 220, maxSize: 560, isPhone: false, isLandscape: true, columns: 10, padding: 2, borderWidth: 1, gap: 0 },
    boardWidth: 220, cellSize: 21.4,
  },
  {
    name: 'Word Grid retains its 224px short-landscape cap',
    options: { areaWidth: 576, heightLimit: 224, maxSize: 520, isPhone: false, isLandscape: true, columns: 4, padding: 12, borderWidth: 1, gap: 8 },
    boardWidth: 224, cellSize: 43.5,
  },
  {
    name: 'Crossword retains its 540px tablet and desktop cap',
    options: { areaWidth: 696, heightLimit: 900, maxSize: 540, isPhone: false, isLandscape: false, columns: 9, padding: 1, borderWidth: 2, gap: 0 },
    boardWidth: 540, cellSize: 59.333333333333336,
  },
  {
    name: 'Word Search retains its 560px tablet and desktop cap',
    options: { areaWidth: 696, heightLimit: 900, maxSize: 560, isPhone: false, isLandscape: false, columns: 10, padding: 2, borderWidth: 1, gap: 0 },
    boardWidth: 560, cellSize: 55.4,
  },
  {
    name: 'Word Grid retains its 520px tablet and desktop cap',
    options: { areaWidth: 696, heightLimit: 900, maxSize: 520, isPhone: false, isLandscape: false, columns: 4, padding: 12, borderWidth: 1, gap: 8 },
    boardWidth: 520, cellSize: 117.5,
  },
  {
    name: 'landscape phones retain their 400px width cap',
    options: { areaWidth: 526, heightLimit: 600, maxSize: 400, isPhone: true, isLandscape: true, columns: 4, padding: 12, borderWidth: 1, gap: 8 },
    boardWidth: 400, cellSize: 87.5,
  },
];

for (const { name, options, boardWidth, cellSize } of gridCases) {
  test(name, () => {
    const actual = calculateGridBoardLayout(options);
    assert.equal(actual.boardWidth, boardWidth);
    assert.equal(actual.cellSize, cellSize);
  });
}

for (const [areaWidth, expected] of [[456, 456], [526, 526], [575, 575]]) {
  test('portrait board fills ' + areaWidth + 'px beyond a desktop 420px cap', () => {
    assert.equal(calculateBoardSize({
      areaWidth, areaHeight: 1100, maxSize: 420, minSize: 120, inset: 0,
      aspectRatio: 1.21, extraHeight: 0, isPhone: true, isLandscape: false,
    }), expected);
  });
}

test('portrait boards remain height-bound and non-board tools may retain their cap', () => {
  const options = {
    areaWidth: 575, areaHeight: 400, maxSize: 420, minSize: 120, inset: 0,
    aspectRatio: 1, extraHeight: 24, isPhone: true, isLandscape: false,
  };
  assert.equal(calculateBoardSize(options), 376);
  assert.equal(calculateBoardSize({ ...options, phoneMaxSize: 280 }), 280);
  assert.equal(calculateBoardSize({ ...options, areaHeight: 1100, isPhone: false }), 420);
  assert.equal(calculateBoardSize({ ...options, areaHeight: 1100, isLandscape: true }), 420);
});
