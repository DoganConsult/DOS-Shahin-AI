/**
 * Page Registry — Dynamic binding.
 *
 * LEGACY STATE (archived to /root/DOS-Platform-Legacy-Archive/runtime/):
 *   PAGE_REGISTRY was a static array of 373 hardcoded PageRegistryEntry objects
 *   covering every page (foundation, governance, risk, compliance, audit,
 *   evidence, workflow, incidents, bcp, vendor, training, qiyas, ai, etc).
 *
 * CURRENT STATE:
 *   PAGE_REGISTRY is empty. All page access data is resolved at runtime from:
 *     - dos.dynamic_ui_routes (route catalog)
 *     - dos.ui_route_template_binding (template bindings)
 *     - /api/dynamic-ui/route-catalog (API endpoint)
 *   DynamicUiBootstrapService.effectivePageRegistry() is the runtime authority.
 */

import { ArchetypeCode } from '../core/runtime/ui-state.models';

export interface PageRegistryEntry {
  pageCode: string;
  moduleCode: string;
  entitlementModuleCodes?: string[];
  route: string;
  layout: 'full' | 'split' | 'wizard' | 'detail' | 'hub';
  featureFlags?: string[];
  requiresModuleActive: boolean;
  requiresPermissions: string[];
  archetypeVisibility?: ArchetypeCode[];
  navVisibility: 'always' | 'entitled' | 'hidden';
}

// Empty — all page data comes from DB at runtime.
export const PAGE_REGISTRY: PageRegistryEntry[] = [];

/** Lookup by route — initially empty, populated by dynamic bootstrap */
export const PAGE_BY_ROUTE = new Map<string, PageRegistryEntry>();

/** Lookup by page code — initially empty, populated by dynamic bootstrap */
export const PAGE_BY_CODE = new Map<string, PageRegistryEntry>();

export interface DynamicFoundationRouteRow {
  module_code?: string;
  path_pattern: string;
  component_key?: string;
  permission_key?: string | null;
  sort_order?: number;
  readiness?: string | null;
}

const HIDDEN_PAGE_READINESS = new Set(['STUB', 'BLOCKED']);

/**
 * Build page registry entries from dynamic route catalog rows.
 * No static fallback — if the DB is empty, the registry is empty.
 */
export function buildFoundationPageRegistry(
  dynamic?: DynamicFoundationRouteRow[],
): PageRegistryEntry[] {
  if (!dynamic || dynamic.length === 0) return [];
  const out: PageRegistryEntry[] = [];
  for (const row of [...dynamic].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )) {
    if (HIDDEN_PAGE_READINESS.has(String(row.readiness ?? '').toUpperCase())) continue;
    out.push({
      pageCode: row.path_pattern.replace(/^\//, '').replace(/\//g, '-'),
      moduleCode: row.module_code || 'unknown',
      route: row.path_pattern,
      layout: 'full',
      requiresModuleActive: false,
      requiresPermissions: row.permission_key ? [row.permission_key] : [],
      navVisibility: 'entitled',
    });
  }
  return out;
}

/**
 * Build the full effective page registry from dynamic route rows.
 * No static entries — everything comes from the DB.
 */
export function buildEffectivePageRegistry(
  dynamicFoundationRoutes?: DynamicFoundationRouteRow[],
): PageRegistryEntry[] {
  return buildFoundationPageRegistry(dynamicFoundationRoutes);
}
