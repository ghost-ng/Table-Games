import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateBoardSize, resolveBoardInset, type CalculateBoardSizeOptions } from './boardSizing';

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
