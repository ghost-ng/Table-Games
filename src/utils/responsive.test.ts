import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getResponsiveLayout } from './responsive';

// Catch off-by-one breakpoints and screen columns that outgrow the viewport.
for (const [width, isPhone, isTablet, isDesktop, contentMaxWidth, contentWidth] of [
  [320, true, false, false, 480, 320],
  [599, true, false, false, 480, 480],
  [600, false, true, false, 720, 600],
  [1023, false, true, false, 720, 720],
  [1024, false, true, true, 1120, 1024],
  [1440, false, true, true, 1120, 1120],
] as const) {
  test(`responsive screen column at ${width}px`, () => {
    const layout = getResponsiveLayout(width, 900);
    assert.equal(layout.isPhone, isPhone);
    assert.equal(layout.isTablet, isTablet);
    assert.equal(layout.isDesktop, isDesktop);
    assert.equal(layout.contentMaxWidth, contentMaxWidth);
    assert.equal(layout.contentWidth, contentWidth);
  });
}

test('landscape depends on both dimensions and excludes square windows', () => {
  assert.equal(getResponsiveLayout(600, 599).isLandscape, true);
  assert.equal(getResponsiveLayout(600, 600).isLandscape, false);
  assert.equal(getResponsiveLayout(600, 601).isLandscape, false);
});

test('desktop has room beyond the old cap without exceeding 1120px', () => {
  const layout = getResponsiveLayout(1440, 900);
  assert.ok(layout.contentWidth > 720);
  assert.ok(layout.contentWidth <= 1120);
});
