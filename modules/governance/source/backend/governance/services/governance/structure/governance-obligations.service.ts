// ============================================
// Shahin-Ai — Governance Obligations Service
// CRUD for compliance obligations derived from
// mandates, with versions, assignments, due dates,
// evidence links, and control links.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listGovernanceObligations(
  tenantId: string,
  filters?: { mandate_id?: string; status?: string; owner_id?: string }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT o.*, m.title_en AS mandate_title
    FROM "${schema}".governance_obligations o
    LEFT JOIN "${schema}".governance_mandates m ON m.mandate_id = o.mandate_id
    WHERE o.deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.mandate_id) { sql += ` AND o.mandate_id = $${idx++}`; params.push(filters.mandate_id); }
  if (filters?.status) { sql += ` AND o.status = $${idx++}`; params.push(filters.status); }
  if (filters?.owner_id) { sql += ` AND o.owner_id = $${idx++}`; params.push(filters.owner_id); }
  sql += ` ORDER BY o.compliance_deadline ASC NULLS LAST, o.created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getObligationById(tenantId: string, obligationId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createObligation(tenantId: string, data: {
  mandate_id?: string;
  title_en: string;
  title_ar?: string;
  description?: string;
  obligation_type?: string;
  frequency?: string;
  owner_id?: string;
  status?: string;
  priority?: string;
  compliance_deadline?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_obligations
      (obligation_id, mandate_id, title_en, title_ar, description, obligation_type, frequency, owner_id, status, priority, compliance_deadline, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [id, data.mandate_id || null, data.title_en, data.title_ar || null, data.description || null,
     data.obligation_type || 'regulatory', data.frequency || null, data.owner_id || null,
     data.status || 'draft', data.priority || 'medium', data.compliance_deadline || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateObligation(tenantId: string, obligationId: string, data: Record<string, unknown>): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function assignObligation(tenantId: string, obligationId: string, data: {
  assignee_id: string;
  assignee_type?: string;
  role?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_obligation_assignments
      (assignment_id, obligation_id, assignee_id, assignee_type, role, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [id, obligationId, data.assignee_id, data.assignee_type || 'user', data.role || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function getObligationDueDates(tenantId: string, obligationId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_obligation_due_dates WHERE obligation_id = $1 ORDER BY due_date`,
    [obligationId]
  );
  return result.rows;
}

export async function completeDueDate(tenantId: string, dueDateId: string): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getObligationEvidenceLinks(tenantId: string, obligationId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_obligation_evidence_links WHERE obligation_id = $1 ORDER BY created_at`,
    [obligationId]
  );
  return result.rows;
}

export async function linkEvidenceToObligation(tenantId: string, obligationId: string, data: {
  evidence_id: string;
  link_type?: string;
  sufficiency_score?: number;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_obligation_evidence_links
      (link_id, obligation_id, evidence_id, link_type, sufficiency_score, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [id, obligationId, data.evidence_id, data.link_type || 'supports', data.sufficiency_score || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function getObligationControlLinks(tenantId: string, obligationId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_obligation_control_links WHERE obligation_id = $1 ORDER BY created_at`,
    [obligationId]
  );
  return result.rows;
}

export async function linkControlToObligation(tenantId: string, obligationId: string, data: {
  control_id: string;
  mapping_type?: string;
  coverage_percent?: number;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_obligation_control_links
      (link_id, obligation_id, control_id, mapping_type, coverage_percent, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [id, obligationId, data.control_id, data.mapping_type || 'addresses', data.coverage_percent || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function requestExemption(tenantId: string, obligationId: string, data: {
  reason: string;
  requested_by: string;
  expiry_date?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_obligation_exemptions
      (exemption_id, obligation_id, reason, requested_by, status, expiry_date)
     VALUES ($1,$2,$3,$4,'pending',$5)
     RETURNING *`,
    [id, obligationId, data.reason, data.requested_by, data.expiry_date || null]
  );
  return result.rows[0];
}
