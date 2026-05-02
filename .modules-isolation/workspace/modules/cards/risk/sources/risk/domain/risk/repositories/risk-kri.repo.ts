// ============================================
// Risk Module — KRI Repository
// Data access for the `risk_kris` aggregate.
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export class RiskKriRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async findAll(filters: Record<string, string> = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['k.deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.riskId) { conditions.push(`k.risk_id = $${idx++}`); params.push(filters.riskId); }
    if (filters.status) { conditions.push(`k.status = $${idx++}`); params.push(filters.status); }
    if (filters.breached) { conditions.push(`k.is_breached = true`); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(filters.pageSize || '25', 10) || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".risk_kris k ${where}`, params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const result = await safeQuery(`
      SELECT k.kri_id, k.name, k.description, k.risk_id, k.status,
             k.threshold_green, k.threshold_amber, k.threshold_red,
             k.current_value, k.is_breached, k.frequency,
             k.last_measured_at, k.owner, k.created_at,
             r.title AS risk_title
      FROM "${this.schema}".risk_kris k
      LEFT JOIN "${this.schema}".risks r ON r.risk_id = k.risk_id
      ${where}
      ORDER BY k.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, offset]);

    return { rows: result.rows, total };
  }

  async findById(kriId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT k.*, r.title AS risk_title
       FROM "${this.schema}".risk_kris k
       LEFT JOIN "${this.schema}".risks r ON r.risk_id = k.risk_id
       WHERE k.kri_id = $1 AND k.deleted_at IS NULL`,
      [kriId],
    );
    return getFirstRow(result);
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(`
      INSERT INTO "${this.schema}".risk_kris
        (kri_id, name, description, risk_id, threshold_green, threshold_amber,
         threshold_red, frequency, owner, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id, data.name || '', data.description || '',
      data.risk_id || null,
      data.threshold_green ?? null, data.threshold_amber ?? null, data.threshold_red ?? null,
      data.frequency || 'monthly', data.owner || '', data.status || 'active',
    ]);
    return getFirstRow(result);
  }

  async update(kriId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".risk_kris SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        threshold_green = COALESCE($3, threshold_green),
        threshold_amber = COALESCE($4, threshold_amber),
        threshold_red = COALESCE($5, threshold_red),
        current_value = COALESCE($6, current_value),
        frequency = COALESCE($7, frequency),
        owner = COALESCE($8, owner),
        status = COALESCE($9, status),
        updated_at = NOW()
      WHERE kri_id = $10 AND deleted_at IS NULL
      RETURNING *
    `, [
      data.name ?? null, data.description ?? null,
      data.threshold_green ?? null, data.threshold_amber ?? null, data.threshold_red ?? null,
      data.current_value ?? null, data.frequency ?? null,
      data.owner ?? null, data.status ?? null,
      kriId,
    ]);
    return getFirstRow(result);
  }

  async recordMeasurement(kriId: string, value: number, _measuredBy?: string): Promise<GenericRow | null> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".risk_kris SET
        current_value = $2,
        last_measured_at = NOW(),
        is_breached = (CASE
          WHEN threshold_red IS NOT NULL AND $2 >= threshold_red THEN true
          ELSE false
        END),
        updated_at = NOW()
      WHERE kri_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [kriId, value]);
    return getFirstRow(result);
  }

  async getHistory(kriId: string, limit = 100): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT * FROM "${this.schema}".risk_score_history
      WHERE entity_id = $1 AND entity_type = 'kri'
      ORDER BY recorded_at DESC LIMIT $2
    `, [kriId, limit]);
    return result.rows;
  }

  async getBreachLog(filters: Record<string, string> = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(filters.pageSize || '25', 10) || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".risk_kris WHERE is_breached = true AND deleted_at IS NULL`,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const result = await safeQuery(`
      SELECT k.kri_id, k.name, k.current_value, k.threshold_red,
             k.last_measured_at, k.risk_id, r.title AS risk_title
      FROM "${this.schema}".risk_kris k
      LEFT JOIN "${this.schema}".risks r ON r.risk_id = k.risk_id
      WHERE k.is_breached = true AND k.deleted_at IS NULL
      ORDER BY k.last_measured_at DESC
      LIMIT $1 OFFSET $2
    `, [pageSize, offset]);

    return { rows: result.rows, total };
  }

  async getCorrelationData(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT k.kri_id, k.name, k.current_value, k.threshold_red,
             k.risk_id, r.title AS risk_title,
             r.likelihood, r.impact, r.risk_score
      FROM "${this.schema}".risk_kris k
      LEFT JOIN "${this.schema}".risks r ON r.risk_id = k.risk_id
      WHERE k.deleted_at IS NULL AND r.deleted_at IS NULL
      ORDER BY k.name
    `);
    return result.rows;
  }
}
