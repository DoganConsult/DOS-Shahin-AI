import { NavItem, QuickActionItem, ProductOwner } from './navigation.models';

// ═══════════════════════════════════════════════════════════════════════
// DYNAMIC NAVIGATION — all module nav items come from the DB.
//
// Legacy state (archived to /root/DOS-Platform-Legacy-Archive/runtime/):
//   - STATIC_FOUNDATION_NAV_CHILDREN: 20 hardcoded NavItem[]
//   - SHAHIN_NAV: 650+ lines of hardcoded module navigation
//   - PLATFORM_NAV_BOTTOM: static nav groups
//   - WIDGET_TO_QUICK_ACTION: hardcoded quick actions
//
// Current state:
//   - DB source: dos.ui_module_nav_group + dos.ui_module_nav_item
//   - API: GET /api/ui-os/module-nav?module=<code>
//   - API: GET /api/dynamic-ui/workspace/nav
//   - FE consumer: DynamicUiBootstrapService.allNavigation()
// ═══════════════════════════════════════════════════════════════════════

/**
 * Map a Dynamic UI navigation row onto the SPA NavItem shape.
 * Used by DynamicUiBootstrapService to convert API responses.
 */
export interface DynamicFoundationNavRow {
  module_code?: string;
  label?: string;
  route: string;
  sort_order?: number;
  readiness?: string | null;
  icon?: string;
  labelEn?: string;
  labelAr?: string;
  parent_code?: string | null;
}

const HIDDEN_DYNAMIC_READINESS = new Set(['STUB', 'BLOCKED']);

/**
 * Build nav children from dynamic DB rows. No hardcoded fallback —
 * if the DB is empty, nav is empty (maintenance mode).
 */
export function buildFoundationNavChildren(dynamic?: DynamicFoundationNavRow[]): NavItem[] {
  if (!dynamic || dynamic.length === 0) return [];
  const merged: NavItem[] = [];
  for (const row of [...dynamic].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (HIDDEN_DYNAMIC_READINESS.has(String(row.readiness ?? '').toUpperCase())) continue;
    merged.push({
      id: row.route.replace(/^\//, '').replace(/\//g, '-'),
      labelEn: row.labelEn || row.label || row.route,
      labelAr: row.labelAr || row.label || row.route,
      route: row.route,
      icon: row.icon || 'circle',
      module: (row.module_code as any) || 'unknown',
    });
  }
  return merged;
}

/**
 * Build a foundation group wrapper — used by the shell when foundation
 * nav items are available from the DB.
 */
export function buildFoundationGroup(children: NavItem[] = []): NavItem {
  return {
    id: 'foundation',
    labelEn: 'Foundation',
    labelAr: 'الأساسيات',
    icon: 'database',
    module: 'foundation',
    productOwner: 'platform',
    children,
  };
}

/**
 * Build platform nav from dynamic children. No static fallback.
 */
export function buildPlatformNav(dynamicFoundationChildren?: DynamicFoundationNavRow[]): NavItem[] {
  const foundationChildren = buildFoundationNavChildren(dynamicFoundationChildren);
  return [
    {
      id: 'home',
      labelEn: 'Home',
      labelAr: 'الرئيسية',
      route: '/workspace-home',
      icon: 'home',
      exact: true,
      productOwner: 'platform',
    },
    ...(foundationChildren.length ? [buildFoundationGroup(foundationChildren)] : []),
  ];
}

// Empty by default — populated from DB at runtime via DynamicUiBootstrapService.
export const PLATFORM_NAV: NavItem[] = buildPlatformNav();

// No static SHAHIN_NAV — all module nav comes from DB.
// DynamicUiBootstrapService.allNavigation() is the runtime source.
export const SHAHIN_NAV: NavItem[] = [];

// No static bottom nav — DB-driven.
export const PLATFORM_NAV_BOTTOM: NavItem[] = [];

// Widget-to-quick-action map — empty by default, populated from
// dos.dynamic_ui_widgets at runtime.
export const WIDGET_TO_QUICK_ACTION: Record<string, QuickActionItem> = {};
