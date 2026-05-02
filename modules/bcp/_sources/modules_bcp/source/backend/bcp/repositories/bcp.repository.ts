// ============================================
// BCP Module — Plan Repository
// Encapsulates all data access for the `bcp_plans` aggregate root.
// Services call these methods instead of raw safeQuery().
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────

export interface CreatePlanInput {
  title: string;
  type: 'bcp' | 'drp';
  content?: Record<string, unknown>;
  test_schedule?: Record<string, unknown>;
  status?: string;
  next_review_date?: string;
  owner_id?: string;
  department_id?: string;
}

export interface UpdatePlanInput {
  title?: string;
  content?: Record<string, unknown>;
  test_schedule?: Record<string, unknown>;
  status?: string;
  next_review_date?: string;
  last_tested_at?: string;
  owner_id?: string;
  department_id?: string;
}

export interface ListPlansFilter {
  type?: string;
  status?: string;
  owner_id?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

// ── Repository ───────────────────────────────────────

export class BcpPlanRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // --- Single entity reads ---

  async findById(planId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".bcp_plans WHERE plan_id = $1 AND deleted_at IS NULL`,
      [planId],
    );
    return getFirstRow(result);
  }

  // --- List with filters + pagination ---

  async findAll(filters: ListPlansFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.type) { conditions.push(`type = $${idx++}`); params.push(filters.type); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.owner_id) { conditions.push(`owner_id = $${idx++}`); params.push(filters.owner_id); }
    if (filters.search) {
      conditions.push(`(title ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const SORTABLE: Record<string, string> = {
      created_at: 'created_at',
      title: 'title',
      status: 'status',
      next_review_date: 'next_review_date',
      last_tested_at: 'last_tested_at',
      updated_at: 'updated_at',
    };
    const sortCol = SORTABLE[filters.sortBy || ''] || 'created_at';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".bcp_plans ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".bcp_plans ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  // --- Create ---

  async create(data: CreatePlanInput): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".bcp_plans
        (title, type, content, test_schedule, status, next_review_date, owner_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.title,
        data.type,
        data.content ? JSON.stringify(data.content) : null,
        data.test_schedule ? JSON.stringify(data.test_schedule) : null,
        data.status || 'draft',
        data.next_review_date || null,
        data.owner_id || null,
        data.department_id || null,
      ],
    );
    return getFirstRow(result);
  }

  // --- Update (partial) ---

  async update(planId: string, data: UpdatePlanInput): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".bcp_plans SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        test_schedule = COALESCE($3, test_schedule),
        status = COALESCE($4, status),
        next_review_date = COALESCE($5, next_review_date),
        last_tested_at = COALESCE($6, last_tested_at),
        owner_id = COALESCE($7, owner_id),
        department_id = COALESCE($8, department_id),
        updated_at = NOW()
       WHERE plan_id = $9 AND deleted_at IS NULL
       RETURNING *`,
      [
        data.title ?? null,
        data.content ? JSON.stringify(data.content) : null,
        data.test_schedule ? JSON.stringify(data.test_schedule) : null,
        data.status ?? null,
        data.next_review_date ?? null,
        data.last_tested_at ?? null,
        data.owner_id ?? null,
        data.department_id ?? null,
        planId,
      ],
    );
    return getFirstRow(result);
  }

  // --- Soft delete ---

  async softDelete(planId: string, _deletedBy?: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".bcp_plans SET deleted_at = NOW(), updated_at = NOW()
       WHERE plan_id = $1 AND deleted_at IS NULL RETURNING plan_id`,
      [planId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  // --- Count ---

  async count(filters: { status?: string; type?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.type) { conditions.push(`type = $${idx++}`); params.push(filters.type); }

    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".bcp_plans WHERE ${conditions.join(' AND ')}`,
      params,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  // --- Plans approaching review ---

  async findApproachingReview(withinDays: number = 30): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT plan_id, title, next_review_date, status
      FROM "${this.schema}".bcp_plans
      WHERE deleted_at IS NULL AND status IN ('approved','active')
        AND next_review_date IS NOT NULL
        AND next_review_date BETWEEN NOW() AND NOW() + $1 * INTERVAL '1 day'
      ORDER BY next_review_date LIMIT 50`,
      [withinDays],
    );
    return result.rows;
  }

  // --- Stale plans (past review date) ---

  async countStale(): Promise<number> {
    const result = await safeQuery(`
      SELECT COUNT(*)::int AS total FROM "${this.schema}".bcp_plans
      WHERE status IN ('approved','active') AND deleted_at IS NULL
        AND next_review_date IS NOT NULL AND next_review_date < NOW()`,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  // --- Plan currency score (% with valid review dates) ---

  async getPlanCurrency(): Promise<{ total: number; current_plans: number }> {
    const result = await safeQuery(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE next_review_date IS NOT NULL AND next_review_date >= NOW())::int AS current_plans
      FROM "${this.schema}".bcp_plans WHERE status IN ('approved','active') AND deleted_at IS NULL`,
    );
    return getFirstRow(result) || { total: 0, current_plans: 0 };
  }
}
