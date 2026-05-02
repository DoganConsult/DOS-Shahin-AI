import type { DSOCAuditEvent } from '@dos/ports/dsoc';

export interface AlertRecord {
  readonly id: number;
  readonly tenantId: string;
  readonly category: string;
  readonly severity: string;
  readonly action: string;
  readonly status: 'open' | 'acknowledged' | 'resolved' | 'suppressed';
  readonly createdAt: string;
  readonly payload: Record<string, unknown>;
}

export interface AlertsRepository {
  raise(event: DSOCAuditEvent, auditEventId?: number): Promise<{ id: number }>;
  listOpen(tenantId: string): Promise<readonly AlertRecord[]>;
  acknowledge(id: number, by: string): Promise<boolean>;
  resolve(id: number, by: string): Promise<boolean>;
}

export class InMemoryAlertsRepository implements AlertsRepository {
  private rows: AlertRecord[] = [];
  private nextId = 1;

  async raise(event: DSOCAuditEvent): Promise<{ id: number }> {
    const id = this.nextId++;
    this.rows.push({
      id,
      tenantId: event.tenantId,
      category: event.category,
      severity: event.severity,
      action: event.action,
      status: 'open',
      createdAt: new Date().toISOString(),
      payload: { ...(event.attributes ?? {}) },
    });
    return { id };
  }

  async listOpen(tenantId: string): Promise<readonly AlertRecord[]> {
    return this.rows.filter((r) => r.tenantId === tenantId && r.status === 'open');
  }

  async acknowledge(id: number, _by: string): Promise<boolean> {
    const r = this.rows.find((x) => x.id === id);
    if (!r || r.status !== 'open') return false;
    (r as { status: string }).status = 'acknowledged';
    return true;
  }

  async resolve(id: number, _by: string): Promise<boolean> {
    const r = this.rows.find((x) => x.id === id);
    if (!r || r.status === 'resolved') return false;
    (r as { status: string }).status = 'resolved';
    return true;
  }
}

export class PgAlertsRepository implements AlertsRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async raise(event: DSOCAuditEvent, auditEventId?: number): Promise<{ id: number }> {
    const { rows } = await this.query(
      `INSERT INTO platform_dsoc.alerts (
         tenant_id, audit_event_id, category, severity, action, payload, status
       ) VALUES ($1,$2,$3,$4,$5,$6,'open') RETURNING id`,
      [
        event.tenantId,
        auditEventId ?? null,
        event.category,
        event.severity,
        event.action,
        JSON.stringify(event.attributes ?? {}),
      ],
    );
    return { id: rows[0].id };
  }

  async listOpen(tenantId: string): Promise<readonly AlertRecord[]> {
    const { rows } = await this.query(
      `SELECT id, tenant_id, category, severity, action, status, created_at, payload
         FROM platform_dsoc.alerts
         WHERE tenant_id = $1 AND status = 'open'
         ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      category: r.category,
      severity: r.severity,
      action: r.action,
      status: r.status,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      payload: r.payload ?? {},
    }));
  }

  async acknowledge(id: number, by: string): Promise<boolean> {
    const { rows } = await this.query(
      `UPDATE platform_dsoc.alerts
          SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW()
          WHERE id = $1 AND status = 'open'
          RETURNING id`,
      [id, by],
    );
    return rows.length > 0;
  }

  async resolve(id: number, by: string): Promise<boolean> {
    const { rows } = await this.query(
      `UPDATE platform_dsoc.alerts
          SET status = 'resolved', resolved_by = $2, resolved_at = NOW()
          WHERE id = $1 AND status <> 'resolved'
          RETURNING id`,
      [id, by],
    );
    return rows.length > 0;
  }
}
