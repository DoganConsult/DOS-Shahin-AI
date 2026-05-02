export const CANONICAL_ROLES = [
  { code: 'super_admin', name: 'Super Admin', level: 100 },
  { code: 'tenant_admin', name: 'Tenant Admin', level: 90 },
  { code: 'module_admin', name: 'Module Admin', level: 80 },
  { code: 'manager', name: 'Manager', level: 60 },
  { code: 'analyst', name: 'Analyst', level: 40 },
  { code: 'viewer', name: 'Viewer', level: 10 },
] as const;
