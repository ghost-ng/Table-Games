import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMancalaStoneSlots } from './mancalaPresentation';
import * as mancalaPresentation from './mancalaPresentation';

test('store presentation reserves an external gutter large enough for two-digit body-font counts', () => {
  const getStore = mancalaPresentation.getMancalaStorePresentation;
  assert.equal(typeof getStore, 'function', 'store counts need explicit external-gutter geometry');
  for (const unit of [45.77, 60, 119.05]) {
    for (const width of [unit * 0.88, unit * 1.88]) {
      const layout = getStore(unit, width);
      const priorClusterWidth = width - Math.max(22, Math.min(width * 0.28, unit * 0.3));
      assert.equal(layout.clusterWidth, priorClusterWidth, 'stone cluster dimensions stay unchanged');
      assert.ok(layout.countLeft > layout.clusterWidth, 'count gutter is outside the store well');
      assert.ok(layout.countLeft + layout.countWidth <= width + 0.001, 'count stays inside its store allocation');
      assert.ok(layout.countFontSize >= 11, 'phone counts remain readable');
      assert.ok(layout.countFontSize * 1.2 + 6 <= layout.countWidth, 'two body-font digits plus padding fit');
    }
  }
});

test('mancala stone slots cap the visible cluster while preserving small counts', () => {
  assert.deepEqual(getMancalaStoneSlots(0, 0), []);
  assert.deepEqual(getMancalaStoneSlots(-4, 0), []);

  for (let count = 1; count <= 12; count += 1) {
    assert.equal(getMancalaStoneSlots(count, 3).length, count);
  }

  assert.equal(getMancalaStoneSlots(13, 3).length, 12);
  assert.equal(getMancalaStoneSlots(48, 3).length, 12);
});

test('mancala stone layouts are deterministic per pit and vary between pits', () => {
  const first = getMancalaStoneSlots(12, 4);
  assert.deepEqual(first, getMancalaStoneSlots(12, 4));
  assert.notDeepEqual(first, getMancalaStoneSlots(12, 5));
  assert.equal(new Set(first.map((slot) => slot.seedIndex)).size, 12);
});

test('mancala slot geometry keeps complete sprites inside the pit', () => {
  for (let pitIndex = 0; pitIndex < 14; pitIndex += 1) {
    for (const slot of getMancalaStoneSlots(40, pitIndex)) {
      assert.ok(slot.x >= 0.16 && slot.x <= 0.84, `pit ${pitIndex} x ${slot.x}`);
      assert.ok(slot.y >= 0.16 && slot.y <= 0.84, `pit ${pitIndex} y ${slot.y}`);
      assert.ok(slot.scale >= 0.72 && slot.scale <= 0.92, `pit ${pitIndex} scale ${slot.scale}`);
      assert.ok(slot.rotation >= -28 && slot.rotation <= 28, `pit ${pitIndex} rotation ${slot.rotation}`);
    }
  }
});
