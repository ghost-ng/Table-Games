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

export interface WordGuessLayoutOptions {
  contentWidth: number;
  availableHeight: number;
  isLandscape: boolean;
  rows: number;
  columns: number;
  tileGap: number;
  keyGap: number;
  borderWidth: number;
}

/** Pure Word Guess geometry shared by portrait phones and compact landscape. */
export function calculateWordGuessLayout({
  contentWidth, availableHeight, isLandscape, rows, columns, tileGap, keyGap, borderWidth,
}: WordGuessLayoutOptions) {
  const safeWidth = Math.max(0, contentWidth);
  const sideBySide = isLandscape && availableHeight < 560;
  const heightBoundTile = Math.max(0, (availableHeight - borderWidth * 2 - tileGap * (rows - 1)) / rows);
  const heightBoundBoard = heightBoundTile * columns + borderWidth * 2 + tileGap * (columns - 1);
  const portraitKeyHeight = availableHeight >= 760 ? 58 : 48;
  const portraitBoardHeight = Math.max(180, availableHeight - (portraitKeyHeight * 3 + keyGap * 2 + 20) - 104);
  const portraitTile = Math.max(0, (portraitBoardHeight - borderWidth * 2 - tileGap * (rows - 1)) / rows);
  const portraitHeightBoundBoard = portraitTile * columns + borderWidth * 2 + tileGap * (columns - 1);
  const boardWidth = sideBySide
    ? Math.min(safeWidth * 0.44, heightBoundBoard)
    : Math.min(safeWidth, 520, portraitHeightBoundBoard);
  const tileSize = (boardWidth - borderWidth * 2 - tileGap * (columns - 1)) / columns;
  const boardHeight = tileSize * rows + borderWidth * 2 + tileGap * (rows - 1);
  const keyboardWidth = sideBySide ? Math.max(0, safeWidth - boardWidth - 8) : Math.min(safeWidth, 600);
  const keyWidth = Math.min(48, Math.max(0, (keyboardWidth - keyGap * 9) / 10));
  const keyHeight = sideBySide ? 44 : portraitKeyHeight;
  return { sideBySide, boardWidth, boardHeight, tileSize, keyboardWidth, keyWidth, keyHeight };
}
