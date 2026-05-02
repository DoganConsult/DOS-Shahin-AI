// ISOLATION SHIM for @dos/dauth-shared
// In the real platform this exposes: AuthContext, AuthRole, AuthSubject, RolePermissions, etc.
// Modules consume only the type surface; runtime behavior comes from the host.

export type AuthRole = string;
export type AuthSubject = { id: string; tenantId: string; roles: AuthRole[]; [k: string]: unknown };
export interface AuthContext {
  subject: AuthSubject;
  hasRole(role: AuthRole): boolean;
  hasPermission(perm: string): boolean;
  hasAnyPermission(perms: string[]): boolean;
}
export interface RolePermissions { role: AuthRole; permissions: string[] }
export const ANONYMOUS_SUBJECT: AuthSubject = { id: 'anonymous', tenantId: 'public', roles: [] };
export function createNoopAuthContext(subject: AuthSubject = ANONYMOUS_SUBJECT): AuthContext {
  return {
    subject,
    hasRole: () => false,
    hasPermission: () => false,
    hasAnyPermission: () => false,
  };
}
