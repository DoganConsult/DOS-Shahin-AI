export interface TeamScopeConfig { enabled: boolean; [key: string]: unknown; }

export function resolveTeamScope(tenantId: string, userId: string): Promise<Record<string, unknown>> { return Promise.resolve({}); }
