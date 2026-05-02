import type { AccessSnapshot } from '../contracts/access-snapshot.types';

export interface AccessSnapshotContract {
  getSnapshot(tenantId: string, userId: string): Promise<AccessSnapshot>;
  hasPermission(snapshot: AccessSnapshot, permissionCode: string): boolean;
  hasRole(snapshot: AccessSnapshot, roleCode: string): boolean;
  hasAuthority(snapshot: AccessSnapshot, authorityCode: string): boolean;
  getAllowedModules(snapshot: AccessSnapshot): string[];
  getLandingPage(snapshot: AccessSnapshot): string;
}

export function hasPermission(snapshot: AccessSnapshot, permissionCode: string): boolean {
  return snapshot.effectivePermissions.includes(permissionCode);
}

export function hasRole(snapshot: AccessSnapshot, roleCode: string): boolean {
  return snapshot.functionalRoles.includes(roleCode);
}

export function hasAuthority(snapshot: AccessSnapshot, authorityCode: string): boolean {
  return snapshot.decisionAuthorities.includes(authorityCode);
}

export function getAllowedModules(snapshot: AccessSnapshot): string[] {
  return snapshot.allowedModules;
}

export function getLandingPage(snapshot: AccessSnapshot): string {
  return snapshot.landingHint.landingPage;
}

export function isModuleVisible(snapshot: AccessSnapshot, moduleCode: string): boolean {
  return snapshot.allowedModules.includes(moduleCode);
}

export function getScopeBindings(snapshot: AccessSnapshot, roleCode?: string): AccessSnapshot['scopeBindings'] {
  if (!roleCode) return snapshot.scopeBindings;
  return snapshot.scopeBindings.filter(b => b.roleCode === roleCode);
}
