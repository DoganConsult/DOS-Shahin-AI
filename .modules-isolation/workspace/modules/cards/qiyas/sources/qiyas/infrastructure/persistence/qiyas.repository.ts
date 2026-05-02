import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from "@dos/db";
import type { GenericRow } from "@dos/types";
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export class QiyasRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".qiyas_assessments WHERE assessment_id = $1 AND deleted_at IS NULL`, [id]);
    return getFirstRow(result);
  }

  async findAll(filters: { status?: string; search?: string; page?: number; pageSize?: number; sortBy?: string; sortDir?: string } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.search) { conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const sortCol = filters.sortBy || 'created_at';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".qiyas_assessments ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".qiyas_assessments ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async create(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid().slice(0, 8);
    const cols = ['assessment_id'];
    const vals: unknown[] = [id];
    const keys = Object.keys(data);
    for (const k of keys) { if (k !== 'assessment_id') { cols.push(k); vals.push(data[k]); } }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".qiyas_assessments (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`, vals);
    return getFirstRow(result);
  }

  async update(id: string, data: Record<string, unknown>): Promise<GenericRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      sets.push(`${k} = $${idx++}`);
      params.push(v);
    }
    sets.push(`updated_at = NOW()`);
    params.push(id);
    const result = await safeQuery(
      `UPDATE "${this.schema}".qiyas_assessments SET ${sets.join(', ')} WHERE assessment_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    return getFirstRow(result);
  }

  async softDelete(id: string, deletedBy?: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".qiyas_assessments SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW() WHERE assessment_id = $1 AND deleted_at IS NULL RETURNING assessment_id`,
      [id, deletedBy || SYSTEM_JOB_ACTOR]);
    return (result.rows?.length ?? 0) > 0;
  }

  async count(filters: { status?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".qiyas_assessments WHERE ${conditions.join(' AND ')}`, params);
    return getFirstRow(result)?.total ?? 0;
  }
}
