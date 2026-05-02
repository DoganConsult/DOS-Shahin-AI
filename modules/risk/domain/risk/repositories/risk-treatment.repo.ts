// ============================================
// Risk Module — Treatment Repository
// Data access for the `risk_treatments` aggregate.
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export class RiskTreatmentRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async findAll(filters: Record<string, string> = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['t.deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`t.status = $${idx++}`); params.push(filters.status); }
    if (filters.riskId) { conditions.push(`t.risk_id = $${idx++}`); params.push(filters.riskId); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(filters.pageSize || '25', 10) || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".risk_treatments t ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const result = await safeQuery(`
      SELECT t.treatment_id, t.title, t.status, t.owner,
             t.strategy, t.target_date, t.risk_id,
             r.title AS risk_title,
             t.expected_reduction, t.actual_reduction,
             t.target_residual_score, t.created_at,
             CASE WHEN t.target_date < NOW() AND t.status NOT IN ('done','validated','completed')
                  THEN true ELSE false END AS overdue
      FROM "${this.schema}".risk_treatments t
      LEFT JOIN "${this.schema}".risks r ON r.risk_id = t.risk_id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, offset]);

    return { rows: result.rows, total };
  }

  async findById(treatmentId: string): Promise<GenericRow | null> {
    const result = await safeQuery(`
      SELECT t.*, r.title AS risk_title, r.category AS risk_category
      FROM "${this.schema}".risk_treatments t
      LEFT JOIN "${this.schema}".risks r ON r.risk_id = t.risk_id
      WHERE t.treatment_id = $1 AND t.deleted_at IS NULL
    `, [treatmentId]);
    return getFirstRow(result);
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(`
      INSERT INTO "${this.schema}".risk_treatments
        (treatment_id, title, description, status, owner, strategy,
         target_date, risk_id, expected_reduction, target_residual_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id,
      data.title || '', data.description || '', data.status || 'planned',
      data.owner || '', data.strategy || 'mitigate',
      data.target_date || null, data.risk_id || null,
      data.expected_reduction || 0, data.target_residual_score || null,
    ]);
    return getFirstRow(result);
  }

  async update(treatmentId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".risk_treatments SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        owner = COALESCE($4, owner),
        strategy = COALESCE($5, strategy),
        target_date = COALESCE($6, target_date),
        expected_reduction = COALESCE($7, expected_reduction),
        actual_reduction = COALESCE($8, actual_reduction),
        updated_at = NOW()
      WHERE treatment_id = $9 AND deleted_at IS NULL
      RETURNING *
    `, [
      data.title ?? null, data.description ?? null, data.status ?? null,
      data.owner ?? null, data.strategy ?? null, data.target_date ?? null,
      data.expected_reduction ?? null, data.actual_reduction ?? null,
      treatmentId,
    ]);
    return getFirstRow(result);
  }

  async validate(treatmentId: string, validatedBy: string, notes?: string): Promise<GenericRow | null> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".risk_treatments SET
        status = 'validated', validated_by = $2, validated_at = NOW(),
        validation_notes = $3, updated_at = NOW()
      WHERE treatment_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [treatmentId, validatedBy, notes || null]);
    return getFirstRow(result);
  }

  async getBoardView(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT status, COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE target_date < NOW() AND status NOT IN ('done','validated','completed'))::int AS overdue
      FROM "${this.schema}".risk_treatments
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY status
    `);
    return result.rows;
  }

  async getEffectivenessMetrics(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT t.treatment_id, t.title, t.status, t.strategy,
             t.expected_reduction, t.actual_reduction,
             CASE WHEN t.expected_reduction > 0
                  THEN ROUND((t.actual_reduction::numeric / t.expected_reduction::numeric) * 100, 1)
                  ELSE 0 END AS effectiveness_pct
      FROM "${this.schema}".risk_treatments t
      WHERE t.deleted_at IS NULL AND t.status IN ('done','validated','completed')
      ORDER BY effectiveness_pct DESC
    `);
    return result.rows;
  }
}
