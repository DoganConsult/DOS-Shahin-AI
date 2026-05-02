import type {
  DSOCAuditEvent,
  DSOCEventCategory,
  DSOCSeverity,
} from '@dos/ports/dsoc';

/**
 * Persistence port for the DSOC audit log. Decouples the
 * `DSOCPort.recordAuditEvent` implementation from a specific DB
 * driver — production wires the Postgres adapter, tests wire an
 * in-memory adapter.
 */
export interface AuditLogRepository {
  insert(event: DSOCAuditEvent): Promise<{ id: number }>;
  countByTenant(tenantId: string): Promise<number>;
  recentByTenant(
    tenantId: string,
    limit: number,
  ): Promise<readonly DSOCAuditEvent[]>;
  byCorrelation(correlationId: string): Promise<readonly DSOCAuditEvent[]>;
}

/** In-memory adapter for tests and dry-run boots. */
export class InMemoryAuditLogRepository implements AuditLogRepository {
  private rows: Array<{ id: number; event: DSOCAuditEvent }> = [];
  private nextId = 1;

  async insert(event: DSOCAuditEvent): Promise<{ id: number }> {
    const id = this.nextId++;
    this.rows.push({ id, event });
    return { id };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.rows.filter((r) => r.event.tenantId === tenantId).length;
  }

  async recentByTenant(tenantId: string, limit: number): Promise<readonly DSOCAuditEvent[]> {
    return this.rows
      .filter((r) => r.event.tenantId === tenantId)
      .slice(-limit)
      .reverse()
      .map((r) => r.event);
  }

  async byCorrelation(correlationId: string): Promise<readonly DSOCAuditEvent[]> {
    return this.rows
      .filter((r) => r.event.correlationId === correlationId)
      .map((r) => r.event);
  }
}

/** Postgres adapter — uses @dos/db's `safeQuery` helper. */
export class PgAuditLogRepository implements AuditLogRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async insert(event: DSOCAuditEvent): Promise<{ id: number }> {
    const { rows } = await this.query(
      `INSERT INTO platform_dsoc.audit_log (
         tenant_id, category, severity, actor_type, actor_id,
         action, resource_type, resource_id, outcome, occurred_at,
         attributes, correlation_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        event.tenantId,
        event.category as DSOCEventCategory,
        event.severity as DSOCSeverity,
        event.actor.type,
        event.actor.id,
        event.action,
        event.resource?.type ?? null,
        event.resource?.id ?? null,
        event.outcome,
        event.occurredAt,
        JSON.stringify(event.attributes ?? {}),
        event.correlationId ?? null,
      ],
    );
    return { id: rows[0].id };
  }

  async countByTenant(tenantId: string): Promise<number> {
    const { rows } = await this.query(
      `SELECT COUNT(*)::int AS c FROM platform_dsoc.audit_log WHERE tenant_id = $1`,
      [tenantId],
    );
    return rows[0]?.c ?? 0;
  }

  async recentByTenant(tenantId: string, limit: number): Promise<readonly DSOCAuditEvent[]> {
    const { rows } = await this.query(
      `SELECT tenant_id, category, severity, actor_type, actor_id, action,
              resource_type, resource_id, outcome, occurred_at, attributes, correlation_id
         FROM platform_dsoc.audit_log
         WHERE tenant_id = $1
         ORDER BY occurred_at DESC
         LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map((r) => ({
      tenantId: r.tenant_id,
      category: r.category,
      severity: r.severity,
      actor: { type: r.actor_type, id: r.actor_id },
      action: r.action,
      resource: r.resource_type ? { type: r.resource_type, id: r.resource_id ?? '' } : undefined,
      outcome: r.outcome,
      occurredAt: r.occurred_at instanceof Date ? r.occurred_at.toISOString() : String(r.occurred_at),
      attributes: r.attributes ?? {},
      correlationId: r.correlation_id ?? undefined,
    }));
  }

  async byCorrelation(correlationId: string): Promise<readonly DSOCAuditEvent[]> {
    const { rows } = await this.query(
      `SELECT tenant_id, category, severity, actor_type, actor_id, action,
              resource_type, resource_id, outcome, occurred_at, attributes, correlation_id
         FROM platform_dsoc.audit_log
         WHERE correlation_id = $1
         ORDER BY occurred_at ASC`,
      [correlationId],
    );
    return rows.map((r) => ({
      tenantId: r.tenant_id,
      category: r.category,
      severity: r.severity,
      actor: { type: r.actor_type, id: r.actor_id },
      action: r.action,
      resource: r.resource_type ? { type: r.resource_type, id: r.resource_id ?? '' } : undefined,
      outcome: r.outcome,
      occurredAt: r.occurred_at instanceof Date ? r.occurred_at.toISOString() : String(r.occurred_at),
      attributes: r.attributes ?? {},
      correlationId: r.correlation_id ?? undefined,
    }));
  }
}
