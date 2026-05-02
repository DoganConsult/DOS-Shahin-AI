// ============================================
// Shahin-Ai — Governance Responsibilities Service
// CRUD for responsibility catalog, assignments,
// and accountability gap detection.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listResponsibilities(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_responsibilities WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function createResponsibility(tenantId: string, data: {
  title_en: string;
  title_ar?: string;
  description?: string;
  category?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_responsibilities
      (responsibility_id, title_en, title_ar, description, category, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [id, data.title_en, data.title_ar || null, data.description || null, data.category || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateResponsibility(tenantId: string, responsibilityId: string, data: Record<string, unknown>): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function listAssignments(
  tenantId: string,
  filters?: { assignee_type?: string; scope_type?: string; responsibility_id?: string }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT a.*, r.title_en AS responsibility_title
    FROM "${schema}".governance_responsibility_assignments a
    LEFT JOIN "${schema}".governance_responsibilities r ON r.responsibility_id = a.responsibility_id
    WHERE a.deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.assignee_type) { sql += ` AND a.assignee_type = $${idx++}`; params.push(filters.assignee_type); }
  if (filters?.scope_type) { sql += ` AND a.scope_type = $${idx++}`; params.push(filters.scope_type); }
  if (filters?.responsibility_id) { sql += ` AND a.responsibility_id = $${idx++}`; params.push(filters.responsibility_id); }
  sql += ` ORDER BY a.created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function createAssignment(tenantId: string, data: {
  responsibility_id: string;
  assignee_id: string;
  assignee_type: string;
  scope_type?: string;
  scope_id?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_responsibility_assignments
      (assignment_id, responsibility_id, assignee_id, assignee_type, scope_type, scope_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [id, data.responsibility_id, data.assignee_id, data.assignee_type, data.scope_type || null, data.scope_id || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function removeAssignment(tenantId: string, assignmentId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_responsibility_assignments SET deleted_at = NOW() WHERE assignment_id = $1 AND deleted_at IS NULL RETURNING assignment_id`,
    [assignmentId]
  );
  return result.rows.length > 0;
}

export async function detectAccountabilityGaps(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT 'policy' AS entity_type, p.policy_id AS entity_id, p.title AS entity_name
    FROM "${schema}".policies p
    WHERE p.deleted_at IS NULL AND (p.owner IS NULL OR p.owner = '')
    UNION ALL
    SELECT 'risk' AS entity_type, r.risk_id::text AS entity_id, r.title AS entity_name
    FROM "${schema}".risks r
    WHERE r.deleted_at IS NULL AND (r.owner IS NULL OR r.owner = '')
    UNION ALL
    SELECT 'control' AS entity_type, c.control_id AS entity_id, c.title AS entity_name
    FROM "${schema}".controls c
    WHERE c.deleted_at IS NULL AND (c.owner IS NULL OR c.owner = '')
    ORDER BY entity_type, entity_name
  `);
  return result.rows;
}
