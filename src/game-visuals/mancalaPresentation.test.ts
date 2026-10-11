import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMancalaStoneSlots } from './mancalaPresentation';

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
