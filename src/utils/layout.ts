import { useCallback, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { getResponsiveLayout, type ResponsiveLayoutFlags } from './responsive';
import { calculateBoardSize, resolveBoardInset } from './boardSizing';

export { calculateBoardSize } from './boardSizing';
export type { CalculateBoardSizeOptions } from './boardSizing';

export { BREAKPOINTS, getResponsiveLayout } from './responsive';
export type { ResponsiveLayoutFlags } from './responsive';

/** Upper bound for square game boards, so they stay comfortable on large screens. */
export const MAX_BOARD_SIZE = 560;
const MIN_BOARD_SIZE = 200;

export interface ResponsiveLayout extends ResponsiveLayoutFlags {
  width: number;
  height: number;
}

/** Reactive layout metrics — updates on rotation, window resize and split-screen. */
export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    ...getResponsiveLayout(width, height),
  };
}

export interface BoardFitOptions {
  /** Cap on the board's width. */
  maxSize?: number;
  /** Breathing room kept on every side of the board. */
  inset?: number;
  /** Portrait-phone inset; defaults to zero so boards fill the measured width. */
  phoneInset?: number;
  /** Board height ÷ width (1 for square boards; 6/7 for Connect Four). */
  aspectRatio?: number;
  /** Fixed-height content stacked with the board inside the measured area (e.g. drop arrows). */
  extraHeight?: number;
  /** Floor on the board's width, even if that means overflowing a tiny area. */
  minSize?: number;
}

/**
 * Fits a board into whatever space its container ends up with — portrait phones,
 * landscape phones, tablets and resizable desktop windows alike.
 *
 * Attach `onLayout` to a `flex: 1` (and `alignSelf: 'stretch'`) view that holds the board;
 * `size` is the widest board that fits inside it. Before the first layout pass it falls
 * back to a width-based estimate.
 */
export function useBoardFit({
  maxSize = MAX_BOARD_SIZE,
  inset = 16,
  phoneInset,
  aspectRatio = 1,
  extraHeight = 0,
  minSize = MIN_BOARD_SIZE,
}: BoardFitOptions = {}) {
  const { contentWidth, isPhone, isLandscape } = useResponsive();
  const resolvedInset = resolveBoardInset({ inset, phoneInset, isPhone, isLandscape });
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const size = calculateBoardSize({
    areaWidth: area?.width ?? contentWidth,
    areaHeight: area?.height ?? Number.POSITIVE_INFINITY,
    maxSize,
    minSize,
    inset: resolvedInset,
    aspectRatio,
    extraHeight,
  });

  return { onLayout, size };
}
