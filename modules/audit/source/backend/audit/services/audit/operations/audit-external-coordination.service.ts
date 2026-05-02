// ============================================
// Shahin — Audit External Coordination Service
// Managing external auditor engagements
// Table: external_audit_coordination
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List all coordinations ───────────────────────────────────────────

export async function listCoordinations(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".external_audit_coordination
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return result.rows;
}

// ── Create a new coordination record ─────────────────────────────────

export async function createCoordination(tenantId: string, data: {
  audit_id: string;
  firm_name: string;
  contact_name?: string;
  contact_email?: string;
  engagement_type?: string;
  scope_description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  notes?: string;
}) {
  const s = tenantSchema(tenantId);
  const coordId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".external_audit_coordination
       (coordination_id, audit_id, firm_name, contact_name, contact_email,
        engagement_type, scope_description, start_date, end_date, status, notes, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW()) RETURNING *`,
    [coordId, data.audit_id, data.firm_name, data.contact_name || null,
     data.contact_email || null, data.engagement_type || 'external',
     data.scope_description || null, data.start_date || null,
     data.end_date || null, data.status || 'planned', data.notes || null]
  );
  return getFirstRow(result);
}

// ── Update a coordination record ─────────────────────────────────────

export async function updateCoordination(tenantId: string, id: string, data: Record<string, unknown>) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get coordinations by audit ───────────────────────────────────────

export async function getByAudit(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".external_audit_coordination
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [auditId]
  );
  return result.rows;
}

// ── Delete a coordination record (soft delete) ───────────────────────

export async function deleteCoordination(tenantId: string, id: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".external_audit_coordination
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE coordination_id = $1 AND deleted_at IS NULL RETURNING coordination_id`,
    [id]
  );
  return result.rows.length > 0;
}
