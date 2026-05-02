// ============================================
// Shahin — Audit Regulatory Tracking Service
// Tracking regulatory audit requirements
// Table: regulatory_audit_requirements
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List all regulatory requirements ─────────────────────────────────

export async function listRequirements(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".regulatory_audit_requirements
     WHERE deleted_at IS NULL
     ORDER BY next_due_at ASC NULLS LAST, created_at DESC`
  );
  return result.rows;
}

// ── Create a new requirement ─────────────────────────────────────────

export async function createRequirement(tenantId: string, data: {
  requirement_name: string;
  regulatory_body?: string;
  description?: string;
  frequency?: string;
  next_due_at?: string;
  status?: string;
  linked_audit_id?: string;
  notes?: string;
}) {
  const s = tenantSchema(tenantId);
  const reqId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".regulatory_audit_requirements
       (requirement_id, requirement_name, regulatory_body, description,
        frequency, next_due_at, status, linked_audit_id, notes, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING *`,
    [reqId, data.requirement_name, data.regulatory_body || null,
     data.description || null, data.frequency || 'annual',
     data.next_due_at || null, data.status || 'pending',
     data.linked_audit_id || null, data.notes || null]
  );
  return getFirstRow(result);
}

// ── Update a requirement ─────────────────────────────────────────────

export async function updateRequirement(tenantId: string, id: string, data: Record<string, unknown>) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get overdue items ────────────────────────────────────────────────

export async function getOverdueItems(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".regulatory_audit_requirements
     WHERE status != 'completed'
       AND next_due_at < NOW()
       AND deleted_at IS NULL
     ORDER BY next_due_at ASC`
  );
  return result.rows;
}

// ── Link requirement to an audit ─────────────────────────────────────

export async function linkToAudit(tenantId: string, id: string, auditId: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
