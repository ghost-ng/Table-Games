import { useCallback, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

/** Window-width breakpoints. Phones are anything narrower than `tablet`. */
export const BREAKPOINTS = {
  tablet: 600,
  desktop: 1024,
} as const;

/** Upper bound for square game boards, so they stay comfortable on large screens. */
export const MAX_BOARD_SIZE = 560;
const MIN_BOARD_SIZE = 200;

export interface ResponsiveLayout {
  width: number;
  height: number;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  /** Max width of a screen's content column at this breakpoint. */
  contentMaxWidth: number;
  /** Actual content column width (window width, capped at contentMaxWidth). */
  contentWidth: number;
}

/** Reactive layout metrics — updates on rotation, window resize and split-screen. */
export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const contentMaxWidth = isDesktop ? 720 : isTablet ? 640 : 480;

  return {
    width,
    height,
    isTablet,
    isDesktop,
    isLandscape: width > height,
    contentMaxWidth,
    contentWidth: Math.min(width, contentMaxWidth),
  };
}

export interface BoardFitOptions {
  /** Cap on the board's width. */
  maxSize?: number;
  /** Breathing room kept on every side of the board. */
  inset?: number;
  /** Board height ÷ width (1 for square boards; 6/7 for Connect Four). */
  aspectRatio?: number;
  /** Fixed-height content stacked with the board inside the measured area (e.g. drop arrows). */
  extraHeight?: number;
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
  aspectRatio = 1,
  extraHeight = 0,
}: BoardFitOptions = {}) {
  const { contentWidth } = useResponsive();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const available = area
    ? Math.min(area.width - inset * 2, (area.height - inset * 2 - extraHeight) / aspectRatio)
    : contentWidth - inset * 2;
  const size = Math.floor(Math.max(MIN_BOARD_SIZE, Math.min(available, maxSize)));

  return { onLayout, size };
}
