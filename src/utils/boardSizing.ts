export interface CalculateBoardSizeOptions {
  areaWidth: number;
  areaHeight: number;
  maxSize: number;
  minSize: number;
  inset: number;
  aspectRatio: number;
  extraHeight: number;
  isPhone?: boolean;
  isLandscape?: boolean;
  phoneMaxSize?: number;
}

export function calculateBoardSize({
  areaWidth, areaHeight, maxSize, minSize, inset, aspectRatio, extraHeight,
  isPhone = false, isLandscape = false, phoneMaxSize,
}: CalculateBoardSizeOptions): number {
  const available = Math.min(areaWidth - inset * 2, (areaHeight - inset * 2 - extraHeight) / aspectRatio);
  const widthCap = isPhone && !isLandscape ? phoneMaxSize ?? Number.POSITIVE_INFINITY : maxSize;
  return Math.floor(Math.max(minSize, Math.min(available, widthCap)));
}

export function resolveBoardInset({ inset, phoneInset, isPhone, isLandscape }: {
  inset: number;
  phoneInset?: number;
  isPhone: boolean;
  isLandscape: boolean;
}): number {
  return isPhone && !isLandscape ? phoneInset ?? 0 : inset;
}

export interface GridBoardLayoutOptions {
  areaWidth: number;
  heightLimit: number;
  maxSize: number;
  isPhone: boolean;
  isLandscape: boolean;
  columns: number;
  padding: number;
  borderWidth: number;
  gap: number;
}

/** Fits the outer board, then distributes its content width without flooring cells. */
export function calculateGridBoardLayout({
  areaWidth, heightLimit, maxSize, isPhone, isLandscape, columns, padding, borderWidth, gap,
}: GridBoardLayoutOptions): { boardWidth: number; cellSize: number } {
  const widthCap = isPhone && !isLandscape ? Number.POSITIVE_INFINITY : maxSize;
  const boardWidth = Math.min(areaWidth, widthCap, heightLimit);
  const cellSize = (boardWidth - (padding + borderWidth) * 2 - gap * (columns - 1)) / columns;
  return { boardWidth, cellSize };
}
