export interface OrgScopeConfig { enabled: boolean; [key: string]: unknown; }

export function resolveOrgScope(tenantId: string, userId: string): Promise<Record<string, unknown>> { return Promise.resolve({}); }
