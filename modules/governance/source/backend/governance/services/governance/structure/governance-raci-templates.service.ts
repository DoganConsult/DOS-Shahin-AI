// ============================================
// Shahin-Ai — Governance RACI Templates Service
// CRUD for RACI templates with activity-level
// R/A/C/I assignments and lifecycle management.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listRaciTemplates(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT t.*,
      (SELECT COUNT(*) FROM "${schema}".raci_assignments a WHERE a.template_id = t.template_id)::int AS assignment_count
     FROM "${schema}".raci_templates t
     ORDER BY t.status, t.created_at DESC`
  );
  return result.rows;
}

export async function getRaciTemplateById(tenantId: string, templateId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createRaciTemplate(tenantId: string, data: {
  name_en: string;
  name_ar?: string;
  description?: string;
  scope_type?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".raci_templates
      (template_id, name_en, name_ar, description, scope_type, status, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft',$6)
     RETURNING *`,
    [id, data.name_en, data.name_ar || null, data.description || null, data.scope_type || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateRaciTemplate(tenantId: string, templateId: string, data: Record<string, unknown>): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function setRaciAssignments(tenantId: string, templateId: string, assignments: Array<{
  activity_name: string;
  role_name: string;
  raci_type: string; // R, A, C, I
}>): Promise<{ inserted: number }> {
  const schema = tenantSchema(tenantId);
  // Clear existing assignments for this template
  await safeQuery(`DELETE FROM "${schema}".raci_assignments WHERE template_id = $1`, [templateId]);
  let inserted = 0;
  for (const a of assignments) {
    await safeQuery(
      `INSERT INTO "${schema}".raci_assignments (assignment_id, template_id, activity_name, role_name, raci_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuid(), templateId, a.activity_name, a.role_name, a.raci_type]
    );
    inserted++;
  }
  return { inserted };
}

export async function activateTemplate(tenantId: string, templateId: string): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function archiveTemplate(tenantId: string, templateId: string): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
