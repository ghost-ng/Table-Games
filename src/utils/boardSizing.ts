export interface CalculateBoardSizeOptions {
  areaWidth: number;
  areaHeight: number;
  maxSize: number;
  minSize: number;
  inset: number;
  aspectRatio: number;
  extraHeight: number;
}

export function calculateBoardSize({
  areaWidth, areaHeight, maxSize, minSize, inset, aspectRatio, extraHeight,
}: CalculateBoardSizeOptions): number {
  const available = Math.min(areaWidth - inset * 2, (areaHeight - inset * 2 - extraHeight) / aspectRatio);
  return Math.floor(Math.max(minSize, Math.min(available, maxSize)));
}

export function resolveBoardInset({ inset, phoneInset, isPhone, isLandscape }: {
  inset: number;
  phoneInset?: number;
  isPhone: boolean;
  isLandscape: boolean;
}): number {
  return isPhone && !isLandscape ? phoneInset ?? 0 : inset;
}
