// ============================================
// Shahin — Audit Team Service
// Team composition and workload per audit
// Table: audit_team_members
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── Get team for an audit ───────────────────────────────────────────

export async function getTeam(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_team_members
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [auditId]
  );
  return result.rows;
}

// ── Assign member to audit ──────────────────────────────────────────

export async function assignMember(tenantId: string, data: {
  audit_id: string; user_id: string; role?: string;
  hours_planned?: number; start_date?: string; end_date?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_team_members
       (id, audit_id, user_id, role, hours_planned, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [id, data.audit_id, data.user_id, data.role || 'auditor',
     data.hours_planned || null, data.start_date || null, data.end_date || null]
  );
  return getFirstRow(result);
}

// ── Remove member from audit (soft delete) ──────────────────────────

export async function removeMember(tenantId: string, id: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audit_team_members
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );
  return result.rows.length > 0;
}

// ── Update actual hours ─────────────────────────────────────────────

export async function updateHours(tenantId: string, id: string, hoursActual: number) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Workload summary (grouped by user) ──────────────────────────────

export async function getWorkloadSummary(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       user_id,
       COUNT(*)::int AS assignment_count,
       COALESCE(SUM(hours_planned), 0)::numeric AS total_hours_planned,
       COALESCE(SUM(hours_actual), 0)::numeric AS total_hours_actual
     FROM "${s}".audit_team_members
     WHERE deleted_at IS NULL
     GROUP BY user_id
     ORDER BY total_hours_actual DESC`
  );
  return result.rows;
}
