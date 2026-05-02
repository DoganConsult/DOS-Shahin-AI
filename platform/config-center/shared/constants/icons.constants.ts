/**
 * Icon Constants
 * 
 * Centralized icon mappings for status, phase, action, UI, and route-based icons.
 * Provides a unified icon system for the platform.
 * 
 * @see ACTION_PLAN_REMAINING_ITEMS.md for migration notes
 */

import { NAV_ICON_MAP } from '../utils/nav-icons';

export const STATUS_ICONS: Record<string, string> = {
  pending: 'pi-circle',
  in_progress: 'pi-spin pi-spinner',
  completed: 'pi-check-circle',
  skipped: 'pi-minus-circle',
  failed: 'pi-times-circle',
  blocked: 'pi-ban',
  cancelled: 'pi-times',
};

export const PHASE_ICONS: Record<string, string> = {
  foundation: 'pi-building',
  assessment: 'pi-search',
  implementation: 'pi-wrench',
  operations: 'pi-sync',
  continuous_improvement: 'pi-chart-line',
};

export const ACTION_ICONS: Record<string, string> = {
  create: 'pi-plus',
  edit: 'pi-pencil',
  delete: 'pi-trash',
  save: 'pi-save',
  cancel: 'pi-times',
  close: 'pi-times',
  search: 'pi-search',
  filter: 'pi-filter',
  download: 'pi-download',
  upload: 'pi-upload',
  refresh: 'pi-refresh',
  view: 'pi-eye',
  export: 'pi-file-export',
  import: 'pi-file-import',
};

export const UI_ICONS: Record<string, string> = {
  chevron_left: 'pi-chevron-left',
  chevron_right: 'pi-chevron-right',
  spinner: 'pi-spin pi-spinner',
  inbox: 'pi-inbox',
  history: 'pi-history',
  clock: 'pi-clock',
  user: 'pi-user',
  sparkles: 'pi-sparkles',
  lightbulb: 'pi-lightbulb',
  exclamation_triangle: 'pi-exclamation-triangle',
};

export type IconType = 'route' | 'status' | 'phase' | 'action' | 'ui' | 'direct';

/**
 * Get icon class(es) by name and type.
 * 
 * @param name - Icon name/key
 * @param type - Icon type category
 * @returns PrimeIcons class string (may contain multiple classes like 'pi-spin pi-spinner')
 */
export function getIcon(
  name: string,
  type: IconType = 'route'
): string {
  switch (type) {
    case 'route':
      return NAV_ICON_MAP[name] || `pi-${name}`;
    case 'status':
      return STATUS_ICONS[name] || `pi-${name}`;
    case 'phase':
      return PHASE_ICONS[name] || `pi-${name}`;
    case 'action':
      return ACTION_ICONS[name] || `pi-${name}`;
    case 'ui':
      return UI_ICONS[name] || `pi-${name}`;
    case 'direct':
      return `pi-${name}`;
    default:
      return `pi-${name}`;
  }
}
