export interface MancalaStoneSlot {
  seedIndex: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const MAX_VISIBLE_STONES = 12;

const SAFE_ANCHORS = [
  [0.50, 0.50],
  [0.34, 0.34],
  [0.66, 0.34],
  [0.34, 0.66],
  [0.66, 0.66],
  [0.50, 0.25],
  [0.50, 0.75],
  [0.25, 0.50],
  [0.75, 0.50],
  [0.28, 0.25],
  [0.72, 0.25],
  [0.50, 0.63],
] as const;

function nextSeed(value: number) {
  return (Math.imul(value, 1664525) + 1013904223) >>> 0;
}

/** Deterministic, render-safe stone placement with a twelve-sprite visual cap. */
export function getMancalaStoneSlots(count: number, pitIndex: number): readonly MancalaStoneSlot[] {
  const visibleCount = Math.min(MAX_VISIBLE_STONES, Math.max(0, Math.floor(count)));
  if (visibleCount === 0) return [];

  let seed = ((pitIndex + 17) * 2654435761) >>> 0;
  const anchorOrder = SAFE_ANCHORS.map((_, index) => index);
  for (let index = anchorOrder.length - 1; index > 0; index -= 1) {
    seed = nextSeed(seed);
    const swapIndex = seed % (index + 1);
    [anchorOrder[index], anchorOrder[swapIndex]] = [anchorOrder[swapIndex], anchorOrder[index]];
  }

  return anchorOrder.slice(0, visibleCount).map((anchorIndex, slotIndex) => {
    seed = nextSeed(seed);
    const [x, y] = SAFE_ANCHORS[anchorIndex];
    return {
      seedIndex: slotIndex,
      x,
      y,
      rotation: (seed % 57) - 28,
      scale: 0.72 + ((seed >>> 8) % 21) / 100,
    };
  });
}
