/**
 * Responsive contract — every PageContract MUST declare these three
 * behaviors. The `ui-responsive-contract.mjs` CI guard fails any page
 * contract that omits one of mobile/tablet/desktop.
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveBehavior {
  /** What the page should look like / do at ≤480px (one of: stacked, bottom-nav, drawer, hidden, custom). */
  mobile: string;
  /** What the page should look like / do at 481-1024px. */
  tablet: string;
  /** What the page should look like / do at >1024px (one of: sidebar, split, full, custom). */
  desktop: string;
}

export interface ResponsiveContract {
  responsive: ResponsiveBehavior;
}

export const RESPONSIVE_BREAKPOINTS_PX: Record<Breakpoint, [number, number]> = {
  mobile: [0, 480],
  tablet: [481, 1024],
  desktop: [1025, Number.POSITIVE_INFINITY],
};
