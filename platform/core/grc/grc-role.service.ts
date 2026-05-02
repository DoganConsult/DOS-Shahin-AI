/** @deprecated @removal-date Phase 6 @owner DAuth @replacement core/dauth/access/access.store.ts — Law 8, forbidden 'grc-' naming (§B.3). */
const ADMIN_ROLES = new Set(['tenant_admin', 'platform_super_admin', 'workspace_admin']);

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}
