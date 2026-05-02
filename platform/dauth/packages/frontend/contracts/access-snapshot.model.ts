export interface AccessSnapshot {
  version: string;
  generatedAt: string;
  actor: {
    userId: string;
    email: string;
    displayName: string;
    actorType: string;
  };
  tenant: {
    tenantId: string;
    status: string;
    plan: string;
  };
  permissions: string[];
  roles: string[];
  modules: string[];
  dashboards: string[];
  landingPage: string;
  scopeBindings: Array<{ scopeType: string; scopeId: string; roleCode: string }>;
  decisionAuthorities: string[];
  accessProfiles: string[];
}

export function hasPermission(snapshot: AccessSnapshot, code: string): boolean {
  const normalized = code.toLowerCase().trim();
  return snapshot.permissions.some(p => {
    if (p === normalized) return true;
    if (p === '*') return true;
    if (p.endsWith('.*')) return normalized.startsWith(p.slice(0, -1));
    return false;
  });
}

export function hasRole(snapshot: AccessSnapshot, roleCode: string): boolean {
  return snapshot.roles.includes(roleCode);
}

export function isModuleAllowed(snapshot: AccessSnapshot, moduleCode: string): boolean {
  return snapshot.modules.includes(moduleCode);
}
