/**
 * Convention-based API endpoint map per business moduleCode.
 *
 * The 5 reusable Module*PageComponent classes consume this to resolve
 * real gateway endpoints from a moduleCode supplied via route data.
 * The Dynamic-UI resolver MAY override these per-route via
 * `dos.dynamic_ui_routes.data_resource_key` joining
 * `dos.dynamic_ui_data_resources`; until that resolver is live, this
 * convention map is the source of truth.
 *
 * No fallback. If a moduleCode has no entry, the page renders a Carbon
 * empty-state with the missing endpoint surfaced, never a 404 / silent
 * blank.
 */

export interface ModuleApiBinding {
  /** GET — KPI/summary block on Overview + Reports. */
  summary: string;
  /** GET — primary record list for Records page. */
  records: string;
  /** GET — pending tasks / approvals on Workflows page. */
  workflows: string;
  /** GET — audit trail timeline on Settings + Workflows tail. */
  audit: string;
  /** GET — readiness probe powering health-strip + Settings. */
  health: string;
}

/**
 * Permission keys gating the page-level write/approve actions. Read access
 * is gated upstream by the route's `permission_key`; this map gates the
 * buttons rendered inside each page so the same 5-page pack respects role
 * boundaries (Tenant Owner / Admin / Manager / Auditor / User / Viewer).
 */
export interface ModulePermissions {
  /** Required to render the "New Record" button on Records page. */
  create: string;
  /** Required to render Approve/Reject buttons on Workflows page. */
  approve: string;
  /** Required to render Export action on Reports page. */
  export: string;
  /** Required to render Settings write actions. */
  manage: string;
}

export const MODULE_API_MAP: Readonly<Record<string, ModuleApiBinding>> = {
  foundation: {
    summary:   '/api/audit/summary?moduleCode=foundation',
    records:   '/api/users',
    workflows: '/api/audit/entries?moduleCode=foundation&kind=workflow',
    audit:     '/api/audit/entries?moduleCode=foundation&limit=50',
    health:    '/api/health/foundation',
  },
  risk: {
    summary:   '/api/risk/stats',
    records:   '/api/risk',
    workflows: '/api/audit/entries?moduleCode=risk&kind=workflow',
    audit:     '/api/audit/entries?moduleCode=risk&limit=50',
    health:    '/api/health/risk',
  },
};

export const MODULE_PERMISSIONS_MAP: Readonly<Record<string, ModulePermissions>> = {
  foundation: {
    create:  'foundation.manage',
    approve: 'foundation.workflow.approve',
    export:  'foundation.read',
    manage:  'foundation.manage',
  },
  risk: {
    create:  'risk.record.write',
    approve: 'risk.record.approve',
    export:  'risk.record.read',
    manage:  'risk.manage',
  },
};

export function moduleApi(moduleCode: string): ModuleApiBinding | null {
  return MODULE_API_MAP[moduleCode] ?? null;
}

export function modulePerms(moduleCode: string): ModulePermissions | null {
  return MODULE_PERMISSIONS_MAP[moduleCode] ?? null;
}

/**
 * Append tenant + scope context to a backend URL. The gateway already
 * injects the tenant header, but page-level requests also carry an
 * explicit `tenantId` so multi-tenant DB filters in the service layer
 * never default to the platform-admin scope.
 */
export function withScope(url: string, ctx: { tenantId: string | null }): string {
  if (!ctx.tenantId) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}tenantId=${encodeURIComponent(ctx.tenantId)}`;
}
