export interface OwnershipScopeConfig { enabled: boolean; [key: string]: unknown; }

export function resolveOwnershipScope(tenantId: string, userId: string): Promise<Record<string, unknown>> { return Promise.resolve({}); }
