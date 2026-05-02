export interface AuditEntry {
  tenantId: string;
  actor: string;
  actorType: 'user' | 'system' | 'agent';
  moduleCode: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  correlationId?: string;
  source?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditContext {
  tenantId: string;
  userId: string;
  moduleCode: string;
  correlationId?: string;
}

export function buildAuditEntry(
  ctx: AuditContext,
  entityType: string,
  entityId: string,
  action: string,
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
): AuditEntry {
  return {
    tenantId: ctx.tenantId,
    actor: ctx.userId,
    actorType: 'user',
    moduleCode: ctx.moduleCode,
    entityType,
    entityId,
    action,
    before: changes?.before,
    after: changes?.after,
    correlationId: ctx.correlationId,
    source: 'api',
    timestamp: new Date().toISOString(),
  };
}
