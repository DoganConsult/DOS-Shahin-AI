// ============================================
// Compliance Module — Findings / Gaps Repository
// Data access for the `findings` table (compliance gaps,
// assessment findings, and remediation linkages).
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────

export interface ListFindingsFilter {
  frameworkId?: string;
  severity?: string;
  status?: string;
  sourceType?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface CreateFindingInput {
  title: string;
  description?: string;
  severity: string;
  status?: string;
  source_type?: string;
  source_id?: string;
  assigned_to?: string;
  remediation_id?: string;
  created_by?: string;
}

// ── Repository ───────────────────────────────────────

export class ComplianceFindingsRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async findById(findingId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT f.*, ist.code AS obligation_code, ist.title_en AS obligation_title,
              ist.instrument_id AS framework_id, i.name_en AS framework_name
       FROM "${this.schema}".findings f
       LEFT JOIN instrument_structure ist ON ist.node_id = f.source_id
       LEFT JOIN instruments i ON i.instrument_id = ist.instrument_id
       WHERE f.finding_id = $1 AND f.deleted_at IS NULL`,
      [findingId],
    );
    return getFirstRow(result);
  }

  async findAll(filters: ListFindingsFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['f.deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.frameworkId) {
      conditions.push(`ist.instrument_id = $${idx++}`);
      params.push(filters.frameworkId);
    }
    if (filters.severity) { conditions.push(`f.severity = $${idx++}`); params.push(filters.severity); }
    if (filters.status) { conditions.push(`f.status = $${idx++}`); params.push(filters.status); }
    if (filters.sourceType) { conditions.push(`f.source_type = $${idx++}`); params.push(filters.sourceType); }
    if (filters.assignedTo) { conditions.push(`f.assigned_to = $${idx++}`); params.push(filters.assignedTo); }
    if (filters.search) {
      conditions.push(`(f.title ILIKE $${idx} OR f.description ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM "${this.schema}".findings f
       LEFT JOIN instrument_structure ist ON ist.node_id = f.source_id
       ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const SORTABLE: Record<string, string> = {
      severity: `CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
      created_at: 'f.created_at',
      title: 'f.title',
      status: 'f.status',
    };
    const sortCol = SORTABLE[filters.sortBy || ''] || SORTABLE.severity;
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const dataResult = await safeQuery(
      `SELECT f.finding_id, f.title, f.description, f.severity, f.status,
              f.source_type, f.source_id, f.remediation_id, f.assigned_to,
              f.created_at, f.updated_at,
              ist.code AS obligation_code, ist.title_en AS obligation_title,
              ist.instrument_id AS framework_id, i.name_en AS framework_name
       FROM "${this.schema}".findings f
       LEFT JOIN instrument_structure ist ON ist.node_id = f.source_id
       LEFT JOIN instruments i ON i.instrument_id = ist.instrument_id
       ${where}
       ORDER BY ${sortCol} ${sortDir}, f.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  async create(data: CreateFindingInput): Promise<GenericRow | null> {
    const findingId = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".findings
        (finding_id, title, description, severity, status, source_type,
         source_id, assigned_to, remediation_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        findingId, data.title, data.description || null,
        data.severity, data.status || 'open',
        data.source_type || null, data.source_id || null,
        data.assigned_to || null, data.remediation_id || null,
        data.created_by || null,
      ],
    );
    return getFirstRow(result);
  }

  async update(findingId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".findings SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        severity = COALESCE($3, severity),
        status = COALESCE($4, status),
        assigned_to = COALESCE($5, assigned_to),
        remediation_id = COALESCE($6, remediation_id),
        updated_at = NOW()
       WHERE finding_id = $7 AND deleted_at IS NULL
       RETURNING *`,
      [
        data.title ?? null, data.description ?? null, data.severity ?? null,
        data.status ?? null, data.assigned_to ?? null, data.remediation_id ?? null,
        findingId,
      ],
    );
    return getFirstRow(result);
  }

  async softDelete(findingId: string, _deletedBy?: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".findings SET deleted_at = NOW(), updated_at = NOW()
       WHERE finding_id = $1 AND deleted_at IS NULL RETURNING finding_id`,
      [findingId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  async count(filters: { severity?: string; status?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }

    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".findings WHERE ${conditions.join(' AND ')}`,
      params,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  // --- Severity distribution ---

  async getSeverityDistribution(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT severity, status, COUNT(*)::int AS count
      FROM "${this.schema}".findings
      WHERE deleted_at IS NULL
      GROUP BY severity, status
      ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
    `);
    return result.rows;
  }

  // --- Remediation linkage lookup ---

  async getRemediationTasks(findingIds: string[]): Promise<GenericRow[]> {
    if (findingIds.length === 0) return [];
    const result = await safeQuery(
      `SELECT task_id, title, status, linked_entity_id, assigned_to, due_date
       FROM "${this.schema}".remediation_tasks
       WHERE linked_entity_id = ANY($1) AND deleted_at IS NULL`,
      [findingIds],
    );
    return result.rows;
  }
}
