import { PoolClient } from "pg";
import { v4 as uuid } from "uuid";
import { safeQuery, safeQueryWithClient, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";
import type { GenericRow } from "@dos/types";
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export class ExceptionRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  private exec(sql: string, params: unknown[], client?: PoolClient) {
    return client ? safeQueryWithClient(sql, params, client) : safeQuery(sql, params);
  }

  async findById(id: string, client?: PoolClient): Promise<GenericRow | null> {
    const result = await this.exec(
      `SELECT * FROM "${this.schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL`, [id], client);
    return getFirstRow(result);
  }

  async findByIdForUpdate(id: string, client: PoolClient): Promise<GenericRow | null> {
    const result = await safeQueryWithClient(
      `SELECT * FROM "${this.schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id], client);
    return getFirstRow(result);
  }

  async findByIdForUpdateSkipLocked(id: string, requiredStatus: string, client: PoolClient): Promise<GenericRow | null> {
    const result = await safeQueryWithClient(
      `SELECT * FROM "${this.schema}".exceptions WHERE exception_id = $1 AND status = $2 AND deleted_at IS NULL FOR UPDATE SKIP LOCKED`,
      [id, requiredStatus], client);
    return getFirstRow(result);
  }

  private static readonly ALLOWED_SORT_COLS = new Set([
    'created_at', 'updated_at', 'status', 'risk_level', 'title', 'expiry_date', 'exception_type', 'requested_by',
  ]);

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
    const sortCol = ExceptionRepository.ALLOWED_SORT_COLS.has(filters.sortBy || '') ? filters.sortBy! : 'created_at';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".exceptions ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".exceptions ${where} ORDER BY "${sortCol}" ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  private static readonly ALLOWED_INSERT_COLS = new Set([
    'title', 'description', 'justification', 'compensating_controls', 'risk_level', 'risk_impact',
    'exception_type', 'status', 'expiry_date', 'requested_duration', 'owner', 'control_id',
    'linked_policy_id', 'linked_risk_id', 'linked_obligation_id', 'requested_by',
    'approver_designation', 'approval_chain',
  ]);

  async create(data: Record<string, unknown>, client?: PoolClient): Promise<GenericRow | null> {
    const id = uuid().slice(0, 8);
    const cols = ['"exception_id"'];
    const vals: unknown[] = [id];
    for (const [k, v] of Object.entries(data)) {
      if (k === 'exception_id') continue;
      if (!ExceptionRepository.ALLOWED_INSERT_COLS.has(k)) continue;
      cols.push(`"${k}"`);
      vals.push(v);
    }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.exec(
      `INSERT INTO "${this.schema}".exceptions (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`, vals, client);
    return getFirstRow(result);
  }

  private static readonly ALLOWED_UPDATE_COLS = new Set([
    'title', 'description', 'justification', 'compensating_controls', 'risk_level', 'risk_impact',
    'exception_type', 'status', 'expiry_date', 'requested_duration', 'owner', 'control_id',
    'linked_policy_id', 'linked_risk_id', 'linked_obligation_id', 'approval_chain', 'approver_designation',
  ]);

  async update(id: string, data: Record<string, unknown>, client?: PoolClient): Promise<GenericRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (!ExceptionRepository.ALLOWED_UPDATE_COLS.has(k)) continue;
      sets.push(`"${k}" = $${idx++}`);
      params.push(v);
    }
    if (sets.length === 0) return this.findById(id, client);
    sets.push(`updated_at = NOW()`);
    params.push(id);
    const result = await this.exec(
      `UPDATE "${this.schema}".exceptions SET ${sets.join(', ')} WHERE exception_id = $${idx} AND deleted_at IS NULL RETURNING *`, params, client);
    return getFirstRow(result);
  }

  async softDelete(id: string, deletedBy?: string, client?: PoolClient): Promise<boolean> {
    const result = await this.exec(
      `UPDATE "${this.schema}".exceptions SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW() WHERE exception_id = $1 AND deleted_at IS NULL RETURNING exception_id`,
      [id, deletedBy || SYSTEM_JOB_ACTOR], client);
    return (result.rows?.length ?? 0) > 0;
  }

  async count(filters: { status?: string } = {}): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".exceptions WHERE ${conditions.join(' AND ')}`, params);
    return getFirstRow(result)?.total ?? 0;
  }
}
