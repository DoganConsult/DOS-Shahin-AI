/**
 * Navigation Types
 * 
 * Centralized navigation item interface.
 * Extracted from deprecated sidebar component for reuse across the platform.
 * 
 * @see DEPRECATION_MAP.md for migration notes
 */

import { LifecyclePhase } from '../layout/lifecycle-bar.component';

export interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
  requiredPermission: string;
  section?: string;
  lifecyclePhase: LifecyclePhase | 'account';
  /** AGRC-OS agent ID responsible for this scope (e.g. 'A07') */
  agentId?: string;
  /** Platform module this item belongs to — 'agrc' (default) or 'qiyas' */
  module?: 'agrc' | 'qiyas';
  /** Module group for lifecycle-mode sub-grouping (e.g. 'foundation') */
  moduleGroup?: string;
}
