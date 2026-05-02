// ============================================
// Shahin — Audit Time Tracking Service
// Time logging and efficiency metrics per audit
// Table: audit_time_entries
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List time entries for an audit ───────────────────────────────────

export async function listEntries(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_time_entries
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY entry_date DESC, created_at DESC`,
    [auditId]
  );
  return result.rows;
}

// ── Log time entry ───────────────────────────────────────────────────

export async function logTime(tenantId: string, data: {
  audit_id: string;
  user_id: string;
  activity_type: string;
  hours: number;
  description?: string;
  entry_date: string;
}) {
  const s = tenantSchema(tenantId);
  const entryId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_time_entries
       (entry_id, audit_id, user_id, activity_type, hours, description, entry_date, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW()) RETURNING *`,
    [entryId, data.audit_id, data.user_id, data.activity_type,
     data.hours, data.description || null, data.entry_date]
  );
  return getFirstRow(result);
}

// ── Efficiency metrics (avg hours per audit) ─────────────────────────

export async function getEfficiencyMetrics(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(DISTINCT audit_id)::int AS audits_tracked,
       SUM(hours)::numeric AS total_hours,
       ROUND(AVG(audit_total), 1) AS avg_hours_per_audit,
       MAX(audit_total) AS max_hours_audit,
       MIN(audit_total) AS min_hours_audit
     FROM (
       SELECT audit_id, SUM(hours) AS audit_total
       FROM "${s}".audit_time_entries
       WHERE deleted_at IS NULL
       GROUP BY audit_id
     ) sub`
  );
  return getFirstRow(result);
}

// ── Utilization (hours by user) ──────────────────────────────────────

export async function getUtilization(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       user_id,
       COUNT(*)::int AS entry_count,
       SUM(hours)::numeric AS total_hours,
       COUNT(DISTINCT audit_id)::int AS audits_worked,
       ROUND(AVG(hours), 2) AS avg_hours_per_entry,
       jsonb_object_agg(
         COALESCE(activity_type, 'other'),
         activity_hours
       ) AS hours_by_activity
     FROM (
       SELECT user_id, audit_id, activity_type, hours,
         SUM(hours) OVER (PARTITION BY user_id, activity_type) AS activity_hours
       FROM "${s}".audit_time_entries
       WHERE deleted_at IS NULL
     ) sub
     GROUP BY user_id
     ORDER BY total_hours DESC`
  );
  return result.rows;
}
