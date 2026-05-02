// ============================================
// Compliance Module — Framework Repository
// Encapsulates all data access for the `frameworks` and `controls`
// aggregate roots used throughout the compliance workspace.
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────

export interface CreateFrameworkInput {
  name: string;
  description?: string;
  category?: string;
  status?: string;
  target_date?: string;
  created_by?: string;
}

export interface UpdateFrameworkInput {
  name?: string;
  description?: string;
  category?: string;
  status?: string;
  target_date?: string;
  total_controls?: number;
  implemented_controls?: number;
  completion_percent?: number;
  removed_by_admin?: boolean;
}

export interface ListFrameworksFilter {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface ListControlsFilter {
  frameworkId?: string;
  status?: string;
  testStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

// ── Framework Repository ───────────────────────────────────────

export class ComplianceFrameworkRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // --- Single entity reads ---

  async findById(frameworkId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT f.*, i.name_en, i.name_ar, i.summary_en, i.summary_ar,
              i.type AS instrument_type, i.version, i.regulator_id,
              i.publication_date, i.effective_date, i.sectors, i.mandatory
       FROM "${this.schema}".frameworks f
       LEFT JOIN instruments i ON i.instrument_id = f.framework_id
       WHERE f.framework_id = $1 AND f.deleted_at IS NULL`,
      [frameworkId],
    );
    return getFirstRow(result);
  }

  // --- List with filters + pagination ---

  async findAll(filters: ListFrameworksFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['f.deleted_at IS NULL', '(f.removed_by_admin IS NULL OR f.removed_by_admin = FALSE)'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.category) { conditions.push(`f.category = $${idx++}`); params.push(filters.category); }
    if (filters.status) { conditions.push(`f.status = $${idx++}`); params.push(filters.status); }
    if (filters.search) {
      conditions.push(`(f.name ILIKE $${idx} OR f.description ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const SORTABLE: Record<string, string> = {
      name: 'f.name',
      category: 'f.category',
      status: 'f.status',
      created_at: 'f.created_at',
      completion_percent: 'f.completion_percent',
    };
    const sortCol = SORTABLE[filters.sortBy || ''] || 'f.created_at';
    const sortDir = filters.sortDir === 'DESC' ? 'DESC' : 'ASC';

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".frameworks f ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT f.*, i.name_en, i.name_ar, i.regulator_id, i.type AS instrument_type
       FROM "${this.schema}".frameworks f
       LEFT JOIN instruments i ON i.instrument_id = f.framework_id
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  // --- Create ---

  async create(data: CreateFrameworkInput): Promise<GenericRow | null> {
    const frameworkId = uuid().slice(0, 8);
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".frameworks
        (framework_id, name, description, category, status, target_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        frameworkId, data.name, data.description || null,
        data.category || null, data.status || 'active',
        data.target_date || null, data.created_by || null,
      ],
    );
    return getFirstRow(result);
  }

  // --- Update (partial) ---

  async update(frameworkId: string, data: UpdateFrameworkInput): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".frameworks SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        status = COALESCE($4, status),
        target_date = COALESCE($5, target_date),
        total_controls = COALESCE($6, total_controls),
        implemented_controls = COALESCE($7, implemented_controls),
        completion_percent = COALESCE($8, completion_percent),
        removed_by_admin = COALESCE($9, removed_by_admin),
        updated_at = NOW()
       WHERE framework_id = $10 AND deleted_at IS NULL
       RETURNING *`,
      [
        data.name ?? null, data.description ?? null, data.category ?? null,
        data.status ?? null, data.target_date ?? null,
        data.total_controls ?? null, data.implemented_controls ?? null,
        data.completion_percent ?? null, data.removed_by_admin ?? null,
        frameworkId,
      ],
    );
    return getFirstRow(result);
  }

  // --- Soft delete ---

  async softDelete(frameworkId: string, _deletedBy?: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".frameworks SET deleted_at = NOW(), updated_at = NOW()
       WHERE framework_id = $1 AND deleted_at IS NULL RETURNING framework_id`,
      [frameworkId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  // --- Count ---

  async count(filters: { status?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL', '(removed_by_admin IS NULL OR removed_by_admin = FALSE)'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }

    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".frameworks WHERE ${conditions.join(' AND ')}`,
      params,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  // --- Controls aggregate per framework ---

  async getControlAggregates(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT fw_id AS framework_id,
             COUNT(*)::int AS controls_mapped,
             COUNT(*) FILTER (WHERE c.status = 'implemented')::int AS implemented,
             COUNT(*) FILTER (WHERE c.evidence_ids IS NOT NULL AND array_length(c.evidence_ids, 1) > 0)::int AS with_evidence,
             COUNT(*) FILTER (WHERE c.test_status = 'passed')::int AS tested
      FROM "${this.schema}".controls c, unnest(COALESCE(c.frameworks, ARRAY[]::text[])) AS fw_id
      WHERE c.deleted_at IS NULL
      GROUP BY fw_id
    `);
    return result.rows;
  }

  // --- Controls CRUD (tenant-scoped) ---

  async findControlById(controlId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".controls WHERE control_id = $1 AND deleted_at IS NULL`,
      [controlId],
    );
    return getFirstRow(result);
  }

  async findControls(filters: ListControlsFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.frameworkId) {
      conditions.push(`$${idx} = ANY(frameworks)`);
      params.push(filters.frameworkId);
      idx++;
    }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.testStatus) { conditions.push(`test_status = $${idx++}`); params.push(filters.testStatus); }
    if (filters.search) {
      conditions.push(`(title ILIKE $${idx} OR control_id ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".controls ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".controls ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  async updateControl(controlId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".controls SET
        title = COALESCE($1, title),
        status = COALESCE($2, status),
        test_status = COALESCE($3, test_status),
        mapped_registry_nodes = COALESCE($4, mapped_registry_nodes),
        evidence_ids = COALESCE($5, evidence_ids),
        updated_at = NOW()
       WHERE control_id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [
        data.title ?? null, data.status ?? null, data.test_status ?? null,
        data.mapped_registry_nodes ?? null, data.evidence_ids ?? null,
        controlId,
      ],
    );
    return getFirstRow(result);
  }
}
