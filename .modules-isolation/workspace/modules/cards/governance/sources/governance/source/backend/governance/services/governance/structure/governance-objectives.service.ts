import { v4 as _uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listObjectives(
  tenantId: string,
  filters?: { status?: string; category?: string; owner_id?: string }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_objectives WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.status) { sql += ` AND status = $${idx++}`; params.push(filters.status); }
  if (filters?.category) { sql += ` AND category = $${idx++}`; params.push(filters.category); }
  if (filters?.owner_id) { sql += ` AND owner_id = $${idx++}`; params.push(filters.owner_id); }
  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function listObjectivesTree(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_objectives WHERE deleted_at IS NULL ORDER BY parent_objective_id NULLS FIRST, created_at`
  );
  return result.rows;
}

export async function getObjectiveById(tenantId: string, objectiveId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createObjective(tenantId: string, data: {
  title_en: string;
  title_ar?: string;
  description?: string;
  category?: string;
  target_date?: string;
  owner_id?: string;
  parent_objective_id?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_objectives
      (title_en, title_ar, description, category, target_date, owner_id, parent_objective_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.title_en, data.title_ar || null, data.description || null, data.category || null,
     data.target_date || null, data.owner_id || null, data.parent_objective_id || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateObjective(tenantId: string, objectiveId: string, data: Record<string, unknown>): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function softDeleteObjective(tenantId: string, objectiveId: string, deletedBy?: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_objectives SET deleted_at = NOW(), updated_by = $2 WHERE objective_id = $1 AND deleted_at IS NULL RETURNING objective_id`,
    [objectiveId, deletedBy || null]
  );
  return result.rows.length > 0;
}
