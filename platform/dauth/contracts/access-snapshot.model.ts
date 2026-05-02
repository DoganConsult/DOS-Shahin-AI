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
  return snapshot.permissions.includes(code);
}

export function hasRole(snapshot: AccessSnapshot, roleCode: string): boolean {
  return snapshot.roles.includes(roleCode);
}

export function isModuleAllowed(snapshot: AccessSnapshot, moduleCode: string): boolean {
  return snapshot.modules.includes(moduleCode);
}
