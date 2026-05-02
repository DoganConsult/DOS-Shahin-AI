/**
 * Pure function for display mode styling.
 * No Angular dependencies — fully testable in isolation.
 *
 * Feature: premium-dashboard-overhaul, Task 5.1
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { DisplayModeStyles } from '../../features/layout-grid/layout-grid.types';

/**
 * Returns CSS dimension values for a display mode.
 *
 * Compact:  reduced padding (8px), font (12px), gap (8px), header (32px)
 * Expanded: standard padding (16px), font (14px), gap (16px), header (44px)
 */
export function getDisplayModeStyles(mode: 'compact' | 'expanded'): DisplayModeStyles {
  if (mode === 'compact') {
    return { widgetPadding: 8, fontSize: 12, gap: 8, headerHeight: 32 };
  }
  return { widgetPadding: 16, fontSize: 14, gap: 16, headerHeight: 44 };
}
