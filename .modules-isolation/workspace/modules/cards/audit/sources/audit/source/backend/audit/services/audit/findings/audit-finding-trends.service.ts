// ============================================
// Shahin — Audit Finding Trends Service
// Computed analytics over the findings table
// Table: findings (existing)
// ============================================

import { v4 as _uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';

// ── Findings created per month (trends) ─────────────────────────────

export async function getTrends(tenantId: string, startDate: string, endDate: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
       COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
       COUNT(*) FILTER (WHERE severity = 'low')::int AS low
     FROM "${s}".findings
     WHERE deleted_at IS NULL
       AND created_at >= $1::date
       AND created_at <= $2::date
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month ASC`,
    [startDate, endDate]
  );
  return result.rows;
}

// ── Aging analysis (open findings by age bucket) ────────────────────

export async function getAgingAnalysis(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       CASE
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 30 THEN '0-30'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 60 THEN '31-60'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 90 THEN '61-90'
         ELSE '90+'
       END AS age_bucket,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high
     FROM "${s}".findings
     WHERE deleted_at IS NULL AND status != 'closed'
     GROUP BY age_bucket
     ORDER BY
       CASE age_bucket
         WHEN '0-30' THEN 1
         WHEN '31-60' THEN 2
         WHEN '61-90' THEN 3
         ELSE 4
       END`
  );
  return result.rows;
}

// ── Severity distribution ───────────────────────────────────────────

export async function getSeverityDistribution(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       severity,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE status = 'open')::int AS open,
       COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
       COUNT(*) FILTER (WHERE status = 'in_remediation')::int AS in_remediation
     FROM "${s}".findings
     WHERE deleted_at IS NULL
     GROUP BY severity
     ORDER BY
       CASE severity
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END`
  );
  return result.rows;
}

// ── Top recurring findings ──────────────────────────────────────────

export async function getTopRecurring(tenantId: string, limit: number = 10) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       f.finding_id,
       f.title,
       f.severity,
       f.status,
       COUNT(rf.id)::int AS repeat_count
     FROM "${s}".findings f
     INNER JOIN "${s}".repeat_findings rf ON rf.original_finding_id = f.finding_id
     WHERE f.deleted_at IS NULL
     GROUP BY f.finding_id, f.title, f.severity, f.status
     ORDER BY repeat_count DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
