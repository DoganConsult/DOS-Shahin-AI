export interface ExternalScopeConfig { enabled: boolean; [key: string]: unknown; }

export function resolveExternalScope(tenantId: string, userId: string): Promise<Record<string, unknown>> { return Promise.resolve({}); }
