export interface PositionScopeConfig { enabled: boolean; [key: string]: unknown; }

export function resolvePositionScope(tenantId: string, userId: string): Promise<Record<string, unknown>> { return Promise.resolve({}); }
