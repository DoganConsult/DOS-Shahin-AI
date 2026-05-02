// ============================================
// Shahin — Audit Finding SLAs Service
// SLA configuration and breach detection
// Table: audit_finding_slas
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── Get SLA configuration ────────────────────────────────────────────

export async function getSlaConfig(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_finding_slas
     ORDER BY severity ASC`
  );
  return result.rows;
}

// ── Upsert SLA for a severity level ──────────────────────────────────

export async function upsertSla(
  tenantId: string,
  severity: string,
  resolutionDays: number,
  warningPct: number,
  escalationTo: string
) {
  const s = tenantSchema(tenantId);
  const slaId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_finding_slas
       (sla_id, severity, resolution_days, warning_pct, escalation_to, created_at)
     VALUES ($1,$2,$3,$4,$5, NOW())
     ON CONFLICT (severity) DO UPDATE SET
       resolution_days = EXCLUDED.resolution_days,
       warning_pct = EXCLUDED.warning_pct,
       escalation_to = EXCLUDED.escalation_to,
       updated_at = NOW()
     RETURNING *`,
    [slaId, severity, resolutionDays, warningPct, escalationTo]
  );
  return getFirstRow(result);
}

// ── Get breached findings ────────────────────────────────────────────

export async function getBreachedFindings(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT f.*, sla.resolution_days, sla.escalation_to,
       EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_open,
       EXTRACT(DAY FROM NOW() - f.created_at)::int - sla.resolution_days AS days_overdue
     FROM "${s}".findings f
     JOIN "${s}".audit_finding_slas sla ON sla.severity = f.severity
     WHERE f.status = 'open'
       AND f.deleted_at IS NULL
       AND f.created_at + (sla.resolution_days || ' days')::interval < NOW()
     ORDER BY days_overdue DESC`
  );
  return result.rows;
}

// ── Get SLA compliance rate ──────────────────────────────────────────

export async function getSlaCompliance(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `WITH finding_sla AS (
       SELECT f.finding_id, f.severity, f.status, f.created_at,
         sla.resolution_days,
         CASE
           WHEN f.status = 'closed' THEN
             CASE WHEN f.updated_at <= f.created_at + (sla.resolution_days || ' days')::interval
               THEN true ELSE false END
           WHEN f.status = 'open' THEN
             CASE WHEN NOW() <= f.created_at + (sla.resolution_days || ' days')::interval
               THEN true ELSE false END
           ELSE true
         END AS within_sla
       FROM "${s}".findings f
       JOIN "${s}".audit_finding_slas sla ON sla.severity = f.severity
       WHERE f.deleted_at IS NULL
     )
     SELECT
       COUNT(*)::int AS total_findings,
       COUNT(*) FILTER (WHERE within_sla)::int AS within_sla_count,
       COUNT(*) FILTER (WHERE NOT within_sla)::int AS breached_count,
       CASE WHEN COUNT(*) > 0
         THEN ROUND(COUNT(*) FILTER (WHERE within_sla)::numeric / COUNT(*)::numeric * 100, 1)
         ELSE 100
       END AS compliance_pct
     FROM finding_sla`
  );
  return getFirstRow(result);
}
