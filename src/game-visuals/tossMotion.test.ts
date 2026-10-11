import assert from 'node:assert/strict';
import test from 'node:test';
import * as presentation from './presentation';

test('coin toss has a bounded flight arc, a smaller landing bounce, and no resting drift', () => {
  assert.equal(typeof presentation.getCoinTossFrame, 'function', 'coin motion needs a physical toss frame');
  const frame = presentation.getCoinTossFrame;
  for (const size of [110, 240, 360]) {
    assert.equal(frame(0, size, false, false).translateY, 0);
    const peak = frame(0.36, size, false, false);
    assert.ok(peak.translateY < 0 && Math.abs(peak.translateY) <= 28);
    const bounce = frame(0.86, size, false, false);
    assert.ok(bounce.translateY < 0 && Math.abs(bounce.translateY) < Math.abs(peak.translateY));
    const settled = frame(1, size, false, false);
    assert.equal(settled.translateY, 0);
    assert.equal(settled.rotateZ, 0);
    assert.equal(settled.scale, 1);
    assert.equal(settled.rotateY % 360, 0);
  }
});

test('coin rotation exposes both unmirrored faces and the photographed edge, then lands on its selected side', () => {
  assert.equal(typeof presentation.getCoinTossFrame, 'function');
  const seen = new Set<string>();
  for (let step = 0; step <= 100; step++) {
    const frame = presentation.getCoinTossFrame(step / 100, 240, false, false);
    if (frame.frontOpacity > 0.9) seen.add('front');
    if (frame.backOpacity > 0.9) seen.add('back');
    if (frame.edgeOpacity > 0.9) seen.add('edge');
    for (const opacity of [frame.frontOpacity, frame.backOpacity, frame.edgeOpacity]) assert.ok(opacity >= 0 && opacity <= 1);
  }
  assert.deepEqual([...seen].sort(), ['back', 'edge', 'front']);
  const same = presentation.getCoinTossFrame(1, 240, false, false);
  assert.equal(same.frontOpacity, 1);
  assert.equal(same.backOpacity, 0);
  const opposite = presentation.getCoinTossFrame(1, 240, true, false);
  assert.equal(opposite.backOpacity, 1);
  assert.equal(opposite.frontOpacity, 0);
  assert.equal((opposite.rotateY + 180) % 360, 0, 'back artwork is upright, not mirrored, at landing');
});

test('coin toss never crossfades a translucent full face behind the edge artwork', () => {
  for (const landsOpposite of [false, true]) {
    for (let step = 0; step <= 200; step++) {
      const frame = presentation.getCoinTossFrame(step / 200, 240, landsOpposite, false);
      const opacities = [frame.frontOpacity, frame.backOpacity, frame.edgeOpacity];
      assert.ok(opacities.every((opacity) => opacity === 0 || opacity === 1), `fractional opacity at step ${step}: ${opacities}`);
      assert.equal(opacities.reduce<number>((sum, opacity) => sum + opacity, 0), 1, `exactly one photographed surface must be visible at step ${step}`);
    }
  }
});

test('dice tumble along distinct bounded paths and settle perfectly upright', () => {
  assert.equal(typeof presentation.getDiceRollFrame, 'function', 'dice need per-index tumble frames');
  const rest = { translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1 };
  for (const size of [44, 100, 180]) {
    for (let index = 0; index < 6; index++) {
      assert.deepEqual(presentation.getDiceRollFrame(0, size, index, false), rest);
      assert.deepEqual(presentation.getDiceRollFrame(1, size, index, false), rest);
      for (let step = 1; step < 100; step++) {
        const frame = presentation.getDiceRollFrame(step / 100, size, index, false);
        assert.ok(Math.abs(frame.translateX) <= 5);
        assert.ok(frame.translateY <= 0 && frame.translateY >= -12);
        assert.ok(Math.abs(frame.rotateX) <= 28 && Math.abs(frame.rotateY) <= 22);
        assert.ok(frame.scale > 0 && frame.scale <= 1);
        const angle = frame.rotateZ * Math.PI / 180;
        assert.ok((Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle))) * frame.scale <= 1.001, 'rotated sprite stays within its row allocation');
      }
    }
  }
  assert.notDeepEqual(presentation.getDiceRollFrame(0.3, 100, 0, false), presentation.getDiceRollFrame(0.3, 100, 1, false));
});

test('reduced motion is fully static at every coin and dice animation frame', () => {
  assert.equal(typeof presentation.getCoinTossFrame, 'function');
  assert.equal(typeof presentation.getDiceRollFrame, 'function');
  for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
    assert.deepEqual(presentation.getCoinTossFrame(progress, 240, true, true), {
      translateY: 0, rotateY: 0, rotateZ: 0, scale: 1, frontOpacity: 1, backOpacity: 0, edgeOpacity: 0,
    });
    assert.deepEqual(presentation.getDiceRollFrame(progress, 180, 3, true), {
      translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1,
    });
  }
});
