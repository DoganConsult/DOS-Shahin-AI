/**
 * Pure functions for the RefreshTimer subsystem.
 * No Angular dependencies — fully testable in isolation.
 */

import { WidgetCategory } from '../../features/layout-grid/layout-grid.types';

/** Default refresh intervals in seconds, keyed by widget category. */
const CATEGORY_INTERVALS: Record<string, number> = {
  risk: 60,
  compliance: 300,
  ai: 600,
  evidence: 180,
};

const FALLBACK_INTERVAL = 300;

/**
 * Returns the default refresh interval in seconds for a widget category.
 *
 * - risk → 60
 * - compliance → 300
 * - ai → 600
 * - evidence → 180
 * - all others → 300
 */
export function getDefaultRefreshInterval(category: WidgetCategory): number {
  return CATEGORY_INTERVALS[category] ?? FALLBACK_INTERVAL;
}

/**
 * Computes a random jitter value in the range [0, 5] seconds.
 * Used to stagger simultaneous widget refreshes and avoid backend spikes.
 *
 * Accepts an optional random source (0–1) for deterministic testing.
 */
export function computeJitter(random?: number): number {
  const r = random ?? Math.random();
  return r * 5;
}
