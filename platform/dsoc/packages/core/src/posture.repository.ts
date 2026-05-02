import type { DSOCPostureSnapshot } from '@dos/ports/dsoc';

export interface PostureRepository {
  insert(snapshot: DSOCPostureSnapshot): Promise<{ id: number }>;
  latest(tenantId: string): Promise<DSOCPostureSnapshot | null>;
}

export class InMemoryPostureRepository implements PostureRepository {
  private rows: Array<DSOCPostureSnapshot & { id: number }> = [];
  private nextId = 1;

  async insert(snapshot: DSOCPostureSnapshot): Promise<{ id: number }> {
    const id = this.nextId++;
    this.rows.push({ id, ...snapshot });
    return { id };
  }

  async latest(tenantId: string): Promise<DSOCPostureSnapshot | null> {
    const matches = this.rows.filter((r) => r.tenantId === tenantId);
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    const { id: _id, ...snapshot } = matches[0];
    return snapshot;
  }
}

export class PgPostureRepository implements PostureRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async insert(snapshot: DSOCPostureSnapshot): Promise<{ id: number }> {
    const { rows } = await this.query(
      `INSERT INTO platform_dsoc.posture_snapshots (tenant_id, captured_at, score, findings)
         VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        snapshot.tenantId,
        snapshot.capturedAt,
        snapshot.score,
        JSON.stringify(snapshot.findings ?? []),
      ],
    );
    return { id: rows[0].id };
  }

  async latest(tenantId: string): Promise<DSOCPostureSnapshot | null> {
    const { rows } = await this.query(
      `SELECT tenant_id, captured_at, score, findings
         FROM platform_dsoc.posture_snapshots
         WHERE tenant_id = $1
         ORDER BY captured_at DESC
         LIMIT 1`,
      [tenantId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      tenantId: r.tenant_id,
      capturedAt: r.captured_at instanceof Date ? r.captured_at.toISOString() : String(r.captured_at),
      score: r.score,
      findings: r.findings ?? [],
    };
  }
}
