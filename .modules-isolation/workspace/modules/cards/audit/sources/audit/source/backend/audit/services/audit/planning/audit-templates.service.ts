// ============================================
// Shahin — Audit Templates Service
// Reusable audit program templates
// Table: audit_templates
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List all templates ───────────────────────────────────────────────

export async function listTemplates(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_templates
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return result.rows;
}

// ── Create a template ────────────────────────────────────────────────

export async function createTemplate(tenantId: string, data: {
  template_name: string;
  audit_type?: string;
  description?: string;
  scope_template?: string;
  methodology?: string;
  checklist?: object;
  default_duration_days?: number;
  created_by?: string;
}) {
  const s = tenantSchema(tenantId);
  const templateId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_templates
       (template_id, template_name, audit_type, description, scope_template,
        methodology, checklist, default_duration_days, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING *`,
    [templateId, data.template_name, data.audit_type || 'internal',
     data.description || null, data.scope_template || null,
     data.methodology || null, data.checklist ? JSON.stringify(data.checklist) : null,
     data.default_duration_days || null, data.created_by || null]
  );
  return getFirstRow(result);
}

// ── Update a template ────────────────────────────────────────────────

export async function updateTemplate(tenantId: string, id: string, data: Record<string, unknown>) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Delete a template (soft delete) ──────────────────────────────────

export async function deleteTemplate(tenantId: string, id: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audit_templates
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE template_id = $1 AND deleted_at IS NULL RETURNING template_id`,
    [id]
  );
  return result.rows.length > 0;
}

// ── Get template by ID ──────────────────────────────────────────────

export async function getTemplateById(tenantId: string, id: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_templates
     WHERE template_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return getFirstRow(result) || null;
}

// ── Apply template to an audit ───────────────────────────────────────

export async function applyTemplate(tenantId: string, templateId: string, auditId: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
