// ============================================
// Evidence Module — Evidence Repository
// Encapsulates all data access for the `evidence`
// aggregate root including hash-chain submissions,
// reviews, and cross-entity evidence mappings.
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────

export interface CreateEvidenceInput {
  control_id: string;
  title: string;
  description?: string;
  file_path?: string;
  content?: string;
  submitted_by: string;
  owner_user_id?: string;
  hash?: string;
  previous_hash?: string;
  chain_position?: number;
  status?: string;
  expiry_date?: string;
  framework_code?: string;
  risk_id?: string;
  source_type?: string;
  source_reference?: string;
  org_unit_id?: number | null;
  confidentiality_level?: number;
}

export interface ListEvidenceFilter {
  controlId?: string;
  status?: string;
  frameworkCode?: string;
  riskId?: string;
  submittedBy?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

// ── Repository ───────────────────────────────────────

export class EvidenceRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // --- Single entity reads ---

  async findById(evidenceId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".evidence WHERE evidence_id = $1 AND deleted_at IS NULL`,
      [evidenceId],
    );
    return getFirstRow(result);
  }

  async findByControlId(controlId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".evidence WHERE control_id = $1 AND deleted_at IS NULL ORDER BY chain_position ASC`,
      [controlId],
    );
    return result.rows;
  }

  // --- List with filters + pagination ---

  async findAll(filters: ListEvidenceFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['e.deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.controlId) { conditions.push(`e.control_id = $${idx++}`); params.push(filters.controlId); }
    if (filters.status) { conditions.push(`e.status = $${idx++}`); params.push(filters.status); }
    if (filters.frameworkCode) { conditions.push(`e.framework_code = $${idx++}`); params.push(filters.frameworkCode); }
    if (filters.riskId) { conditions.push(`e.risk_id = $${idx++}`); params.push(filters.riskId); }
    if (filters.submittedBy) { conditions.push(`e.submitted_by = $${idx++}`); params.push(filters.submittedBy); }
    if (filters.search) {
      conditions.push(`(e.title ILIKE $${idx} OR e.description ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const SORTABLE: Record<string, string> = {
      created_at: 'e.created_at',
      title: 'e.title',
      chain_position: 'e.chain_position',
      status: 'e.status',
      expiry_date: 'e.expiry_date',
    };
    const sortCol = SORTABLE[filters.sortBy || ''] || 'e.chain_position';
    const sortDir = filters.sortDir === 'DESC' ? 'DESC' : 'ASC';

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".evidence e ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT e.* FROM "${this.schema}".evidence e ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  // --- Create ---

  async create(data: CreateEvidenceInput): Promise<GenericRow | null> {
    const evidenceId = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".evidence
        (evidence_id, control_id, title, description, file_path, content,
         submitted_by, owner_user_id, created_by, hash, previous_hash,
         chain_position, status, expiry_date, framework_code, risk_id,
         source_type, source_reference, org_unit_id, confidentiality_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$7,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        evidenceId, data.control_id, data.title, data.description || null,
        data.file_path || null, data.content || null,
        data.submitted_by, data.owner_user_id || data.submitted_by,
        data.hash || null, data.previous_hash || null,
        data.chain_position ?? 0, data.status || 'submitted',
        data.expiry_date || null, data.framework_code || null,
        data.risk_id || null, data.source_type || 'manual-upload',
        data.source_reference || null, data.org_unit_id ?? null,
        data.confidentiality_level ?? null,
      ],
    );
    return getFirstRow(result);
  }

  // --- Update ---

  async update(evidenceId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".evidence SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        expiry_date = COALESCE($4, expiry_date),
        updated_at = NOW()
       WHERE evidence_id = $5 AND deleted_at IS NULL
       RETURNING *`,
      [
        data.title ?? null, data.description ?? null,
        data.status ?? null, data.expiry_date ?? null,
        evidenceId,
      ],
    );
    return getFirstRow(result);
  }

  // --- Soft delete ---

  async softDelete(evidenceId: string, _deletedBy?: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".evidence SET deleted_at = NOW(), updated_at = NOW()
       WHERE evidence_id = $1 AND deleted_at IS NULL RETURNING evidence_id`,
      [evidenceId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  // --- Count / Stats ---

  async count(filters: { status?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }

    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".evidence WHERE ${conditions.join(' AND ')}`,
      params,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  async getStatusBreakdown(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT COALESCE(status, 'submitted') AS status, COUNT(*)::int AS count
      FROM "${this.schema}".evidence
      WHERE deleted_at IS NULL
      GROUP BY COALESCE(status, 'submitted')
    `);
    return result.rows;
  }

  async getExpiringEvidence(withinDays: number = 30): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".evidence
       WHERE expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
         AND expiry_date >= CURRENT_DATE
         AND deleted_at IS NULL
       ORDER BY expiry_date ASC`,
      [withinDays],
    );
    return result.rows;
  }

  async getExpiredEvidence(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT * FROM "${this.schema}".evidence
      WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE AND deleted_at IS NULL
      ORDER BY expiry_date ASC
    `);
    return result.rows;
  }

  // --- Hash chain verification ---

  async getChainForControl(controlId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT evidence_id, hash, previous_hash, chain_position
       FROM "${this.schema}".evidence
       WHERE control_id = $1 AND deleted_at IS NULL
       ORDER BY chain_position ASC`,
      [controlId],
    );
    return result.rows;
  }
}
