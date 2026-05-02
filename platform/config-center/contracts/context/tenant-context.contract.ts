/**
 * Tenant Context Contract
 * Defines how tenant context is propagated and resolved across services.
 */

/**
 * Tenant context resolved per-request.
 * Set by gateway from JWT or x-tenant-id header.
 * Used by @dos/db to set search_path for tenant-scoped queries.
 */
export interface TenantContext {
  /** Tenant UUID */
  tenantId: string;

  /** Database schema name: tenant_<uuid_underscored> */
  schemaName: string;

  /** Workspace ID (if workspace-scoped) */
  workspaceId?: string;
}

/**
 * Resolve tenant schema name from tenant ID.
 * Convention: tenant_<uuid with dashes replaced by underscores>
 */
export function tenantSchemaName(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}
