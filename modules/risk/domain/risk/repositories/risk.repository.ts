// ============================================
// Risk Module — Repository Layer
// Encapsulates all data access for the `risks` aggregate root.
// Services call these methods instead of raw safeQuery().
// ============================================

import { v4 as uuid } from 'uuid';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

// ── Types ────────────────────────────────────────────

export interface CreateRiskInput {
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  owner?: string;
  treatment_plan?: string;
  treatment_status?: string;
  control_ids?: string[];
  org_unit_id?: number | null;
  risk_category?: string | null;
  entity_links?: Record<string, unknown> | null;
}

export interface UpdateRiskInput {
  title?: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  status?: string;
  owner?: string;
  treatment_plan?: string;
  treatment_status?: string;
  control_ids?: string[];
  kri_config?: Record<string, unknown>;
  risk_category?: string | null;
  entity_links?: Record<string, unknown> | null;
}

export interface ListRisksFilter {
  category?: string;
  status?: string;
  owner?: string;
  search?: string;
  minScore?: number;
  maxScore?: number;
  severity?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

// ── Repository ───────────────────────────────────────

export class RiskRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // --- Single entity reads ---

  async findById(riskId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`,
      [riskId],
    );
    return getFirstRow(result);
  }

  // --- List with filters + pagination ---

  async findAll(filters: ListRisksFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.category) { conditions.push(`category = $${idx++}`); params.push(filters.category); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.owner) { conditions.push(`owner = $${idx++}`); params.push(filters.owner); }
    if (filters.search) {
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.minScore != null) { conditions.push(`COALESCE(inherent_score, risk_score) >= $${idx++}`); params.push(filters.minScore); }
    if (filters.maxScore != null) { conditions.push(`COALESCE(inherent_score, risk_score) <= $${idx++}`); params.push(filters.maxScore); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const SORTABLE: Record<string, string> = {
      risk_score: 'COALESCE(inherent_score, risk_score)',
      created_at: 'created_at',
      title: 'title',
      category: 'category',
      likelihood: 'likelihood',
      impact: 'impact',
      status: 'status',
      updated_at: 'updated_at',
    };
    const sortCol = SORTABLE[filters.sortBy || ''] || 'COALESCE(inherent_score, risk_score)';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".risks ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".risks ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  // --- Create ---

  async create(data: CreateRiskInput): Promise<GenericRow | null> {
    const riskId = uuid().slice(0, 8);
    const hasExt = data.risk_category != null || data.entity_links != null;

    const columns = [
      'risk_id', 'title', 'description', 'category', 'likelihood', 'impact',
      'owner', 'treatment_plan', 'treatment_status', 'control_ids',
      'owner_user_id', 'created_by', 'org_unit_id',
    ];
    const values: unknown[] = [
      riskId, data.title, data.description, data.category,
      data.likelihood, data.impact,
      data.owner || '', data.treatment_plan || null,
      data.treatment_status || 'untreated', data.control_ids || [],
      data.owner || '', data.owner || '',
      data.org_unit_id ?? null,
    ];

    if (hasExt) {
      columns.push('risk_category', 'entity_links');
      values.push(data.risk_category ?? null);
      values.push(data.entity_links ? JSON.stringify(data.entity_links) : null);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".risks (${columns.join(',')}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return getFirstRow(result);
  }

  // --- Update (partial) ---

  async update(riskId: string, data: UpdateRiskInput): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".risks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        likelihood = COALESCE($4, likelihood),
        impact = COALESCE($5, impact),
        status = COALESCE($6, status),
        owner = COALESCE($7, owner),
        treatment_plan = COALESCE($8, treatment_plan),
        treatment_status = COALESCE($9, treatment_status),
        control_ids = COALESCE($10, control_ids),
        kri_config = COALESCE($11, kri_config),
        risk_category = COALESCE($12, risk_category),
        entity_links = COALESCE($13, entity_links),
        updated_at = NOW()
       WHERE risk_id = $14 AND deleted_at IS NULL
       RETURNING *`,
      [
        data.title ?? null, data.description ?? null, data.category ?? null,
        data.likelihood ?? null, data.impact ?? null, data.status ?? null,
        data.owner ?? null, data.treatment_plan ?? null, data.treatment_status ?? null,
        data.control_ids ?? null, data.kri_config ? JSON.stringify(data.kri_config) : null,
        data.risk_category ?? null,
        data.entity_links != null ? JSON.stringify(data.entity_links) : null,
        riskId,
      ],
    );
    return getFirstRow(result);
  }

  // --- Soft delete ---

  async softDelete(riskId: string, deletedBy?: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE risk_id = $1 AND deleted_at IS NULL RETURNING risk_id`,
      [riskId, deletedBy || SYSTEM_JOB_ACTOR],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  async bulkSoftDelete(riskIds: string[], deletedBy?: string): Promise<number> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE risk_id = ANY($1::text[]) AND deleted_at IS NULL`,
      [riskIds, deletedBy || SYSTEM_JOB_ACTOR],
    );
    return result.rowCount ?? 0;
  }

  // --- Count ---

  async count(filters: { status?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }

    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".risks WHERE ${conditions.join(' AND ')}`,
      params,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  // --- Matrix / Heatmap (read-optimized) ---

  async getMatrixBuckets(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT likelihood, impact, COUNT(*)::int AS count
      FROM "${this.schema}".risks
      WHERE deleted_at IS NULL
      GROUP BY likelihood, impact
      ORDER BY likelihood, impact
    `);
    return result.rows;
  }

  // --- Score history ---

  async getScoreHistory(riskId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".risk_score_history
       WHERE risk_id = $1 ORDER BY recorded_at DESC LIMIT 100`,
      [riskId],
    );
    return result.rows;
  }

  // --- KRI config (embedded in risks table) ---

  async getKriConfig(riskId: string): Promise<Record<string, unknown> | null> {
    const result = await safeQuery(
      `SELECT kri_config FROM "${this.schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`,
      [riskId],
    );
    return getFirstRow(result)?.kri_config ?? null;
  }

  async updateKriConfig(riskId: string, config: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".risks SET kri_config = $1, updated_at = NOW()
       WHERE risk_id = $2 AND deleted_at IS NULL RETURNING *`,
      [JSON.stringify(config), riskId],
    );
    return getFirstRow(result);
  }
}
