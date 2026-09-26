/** Window-width breakpoints. Phones are anything narrower than `tablet`. */
export const BREAKPOINTS = {
  tablet: 600,
  desktop: 1024,
} as const;

export interface ResponsiveLayoutFlags {
  isPhone: boolean;
  /** Inclusive of desktop, preserving the existing useResponsive contract. */
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  contentMaxWidth: number;
  contentWidth: number;
}

/** Pure screen metrics, usable without importing React Native. */
export function getResponsiveLayout(width: number, height: number): ResponsiveLayoutFlags {
  const isTablet = width >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const contentMaxWidth = isDesktop ? 1120 : isTablet ? 720 : 480;

  return {
    isPhone: !isTablet,
    isTablet,
    isDesktop,
    isLandscape: width > height,
    contentMaxWidth,
    contentWidth: Math.min(width, contentMaxWidth),
  };
}
