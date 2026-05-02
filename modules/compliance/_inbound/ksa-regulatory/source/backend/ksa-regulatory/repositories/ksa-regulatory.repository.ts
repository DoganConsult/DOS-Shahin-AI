import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export class KsaRegulatoryRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findReadinessSnapshot(snapshotId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".ksa_regulatory_readiness_snapshots WHERE id = $1 AND deleted_at IS NULL`, [snapshotId]);
    return getFirstRow(result);
  }

  async findAllObligations(filters: { status?: string; authority?: string; page?: number; pageSize?: number } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.authority) { conditions.push(`regulatory_authority = $${idx++}`); params.push(filters.authority); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".obligations ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".obligations ${where} ORDER BY due_date ASC NULLS LAST LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async findRegulatoryChanges(filters: { effectiveAfter?: string; authority?: string } = {}): Promise<GenericRow[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.effectiveAfter) { conditions.push(`effective_date >= $${idx++}`); params.push(filters.effectiveAfter); }
    if (filters.authority) { conditions.push(`authority = $${idx++}`); params.push(filters.authority); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".regulatory_changes ${where} ORDER BY effective_date DESC LIMIT 100`, params);
    return result.rows;
  }

  async createReadinessSnapshot(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid().slice(0, 8);
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".ksa_regulatory_readiness_snapshots (id, tenant_id, snapshot_data, scored_at, created_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
      [id, data.tenant_id, JSON.stringify(data.snapshot_data)]);
    return getFirstRow(result);
  }

  async countObligationsByStatus(): Promise<Record<string, number>> {
    const result = await safeQuery(
      `SELECT status, COUNT(*)::int AS count FROM "${this.schema}".obligations WHERE deleted_at IS NULL GROUP BY status`);
    const byStatus: Record<string, number> = {};
    for (const row of result.rows) { byStatus[row.status] = row.count; }
    return byStatus;
  }
}
