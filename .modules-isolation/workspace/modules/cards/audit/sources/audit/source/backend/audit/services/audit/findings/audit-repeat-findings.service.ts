// ============================================
// Shahin — Audit Repeat Findings Service
// Recurring finding tracking and linkage
// Table: repeat_findings (existing)
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List all repeat findings ────────────────────────────────────────

export async function listRepeatFindings(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rf.*,
       f.title AS finding_title,
       f.severity AS finding_severity,
       f.status AS finding_status,
       of.title AS original_finding_title,
       of.severity AS original_finding_severity
     FROM "${s}".repeat_findings rf
     LEFT JOIN "${s}".findings f ON f.finding_id = rf.finding_id
     LEFT JOIN "${s}".findings of ON of.finding_id = rf.original_finding_id
     ORDER BY rf.created_at DESC`
  );
  return result.rows;
}

// ── Link a finding as a repeat of an original ───────────────────────

export async function linkRepeatFinding(
  tenantId: string,
  findingId: string,
  originalFindingId: string,
  notes?: string
) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".repeat_findings
       (id, finding_id, original_finding_id, notes)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [id, findingId, originalFindingId, notes || null]
  );
  return getFirstRow(result);
}

// ── Get repeat history for a finding ────────────────────────────────

export async function getRepeatHistory(tenantId: string, findingId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rf.*,
       f.title AS linked_finding_title,
       f.severity AS linked_finding_severity,
       f.status AS linked_finding_status,
       f.created_at AS linked_finding_created_at
     FROM "${s}".repeat_findings rf
     LEFT JOIN "${s}".findings f ON f.finding_id = rf.finding_id
     WHERE rf.finding_id = $1 OR rf.original_finding_id = $1
     ORDER BY rf.created_at ASC`,
    [findingId]
  );
  return result.rows;
}
