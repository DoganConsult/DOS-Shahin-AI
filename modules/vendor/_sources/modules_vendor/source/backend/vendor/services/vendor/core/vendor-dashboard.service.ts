// ============================================
// Shahin — Vendor Dashboard Service
// KPI aggregation, work queue, recent activity
// for the vendor risk module dashboard
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ============================================================
// Dashboard KPIs
// ============================================================

/**
 * Aggregate top-level KPIs for the vendor risk dashboard.
 * Returns counts and percentages across all vendor-related tables.
 */
export async function getDashboardKPIs(tenantId: string): Promise<{
  totalVendors: number;
  activeVendors: number;
  highRiskCount: number;
  pendingDD: number;
  expiringContracts30d: number;
  openSLABreaches: number;
  unackedMonitoringAlerts: number;
  concentrationWarnings: number;
  assessmentCompletionPct: number;
  openIssues: number;
  pendingExceptions: number;
}> {
  const schema = tenantSchema(tenantId);

  // Run all KPI queries in parallel for performance
  const [
    vendorCountsRes,
    ddRes,
    expiringRes,
    slaRes,
    monitoringRes,
    concentrationRes,
    assessmentRes,
    issuesRes,
    exceptionsRes,
  ] = await Promise.all([
    // Vendor counts: total, active, high risk
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE risk_tier IN ('high', 'critical'))::int AS high_risk
       FROM "${schema}".vendors WHERE deleted_at IS NULL`
    ),
    // Pending due diligence
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_due_diligence
       WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL`
    ),
    // Contracts expiring within 30 days
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_engagements
       WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
         AND status NOT IN ('terminated', 'expired')
         AND deleted_at IS NULL`
    ),
    // Open SLA breaches
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_sla_breach_log
       WHERE remediation_status NOT IN ('resolved', 'accepted')`
    ),
    // Unacknowledged monitoring alerts
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_monitoring_signals
       WHERE acknowledged = FALSE`
    ),
    // Concentration warnings (high/critical)
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_concentration_analysis
       WHERE risk_level IN ('high', 'critical')`
    ),
    // Assessment completion percentage
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM "${schema}".vendor_risk_assessments WHERE deleted_at IS NULL`
    ),
    // Open issues
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_issues
       WHERE status NOT IN ('resolved', 'closed') AND deleted_at IS NULL`
    ),
    // Pending exceptions
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_exceptions
       WHERE status = 'pending_approval'`
    ),
  ]);

  const vendorCounts = getFirstRow(vendorCountsRes)!;
  const assessmentRow = getFirstRow(assessmentRes)!;
  const assessmentTotal = assessmentRow?.total ?? 0;
  const assessmentCompleted = assessmentRow?.completed ?? 0;
  const assessmentCompletionPct = assessmentTotal > 0
    ? Math.round((assessmentCompleted / assessmentTotal) * 100)
    : 0;

  return {
    totalVendors: vendorCounts?.total ?? 0,
    activeVendors: vendorCounts?.active ?? 0,
    highRiskCount: vendorCounts?.high_risk ?? 0,
    pendingDD: getFirstRow(ddRes)?.cnt ?? 0,
    expiringContracts30d: getFirstRow(expiringRes)?.cnt ?? 0,
    openSLABreaches: getFirstRow(slaRes)?.cnt ?? 0,
    unackedMonitoringAlerts: getFirstRow(monitoringRes)?.cnt ?? 0,
    concentrationWarnings: getFirstRow(concentrationRes)?.cnt ?? 0,
    assessmentCompletionPct,
    openIssues: getFirstRow(issuesRes)?.cnt ?? 0,
    pendingExceptions: getFirstRow(exceptionsRes)?.cnt ?? 0,
  };
}

// ============================================================
// Work Queue
// ============================================================

/**
 * Get categorized work queue items for a specific user.
 * Returns items assigned to or owned by the user across vendor module tables.
 */
export async function getWorkQueue(
  tenantId: string,
  userId: string
): Promise<{
  assignedIssues: GenericRow[];
  pendingDDReviews: GenericRow[];
  expiringEngagements: GenericRow[];
  pendingExceptions: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);

  const [issuesRes, ddRes, engRes, exRes] = await Promise.all([
    // Issues assigned to this user
    safeQuery(
      `SELECT i.*, v.name AS vendor_name
       FROM "${schema}".vendor_issues i
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = i.vendor_id
       WHERE i.assigned_to = $1 AND i.status NOT IN ('resolved', 'closed') AND i.deleted_at IS NULL
       ORDER BY
         CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         i.due_date ASC NULLS LAST`,
      [userId]
    ),
    // DD reviews where this user is the reviewer
    safeQuery(
      `SELECT dd.*, v.name AS vendor_name
       FROM "${schema}".vendor_due_diligence dd
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = dd.vendor_id
       WHERE dd.reviewer_id = $1 AND dd.status IN ('pending', 'in_progress') AND dd.deleted_at IS NULL
       ORDER BY dd.due_date ASC NULLS LAST`,
      [userId]
    ),
    // Engagements owned by this user that are expiring within 90 days
    safeQuery(
      `SELECT e.*, v.name AS vendor_name
       FROM "${schema}".vendor_engagements e
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
       WHERE e.owner_user_id = $1
         AND e.end_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
         AND e.status NOT IN ('terminated', 'expired')
         AND e.deleted_at IS NULL
       ORDER BY e.end_date ASC`,
      [userId]
    ),
    // Pending exception approvals (visible to all approvers)
    safeQuery(
      `SELECT ex.*, v.name AS vendor_name
       FROM "${schema}".vendor_exceptions ex
       LEFT JOIN "${schema}".vendors v ON v.vendor_id = ex.vendor_id
       WHERE ex.status = 'pending_approval'
       ORDER BY ex.created_at ASC`
    ),
  ]);

  return {
    assignedIssues: issuesRes.rows,
    pendingDDReviews: ddRes.rows,
    expiringEngagements: engRes.rows,
    pendingExceptions: exRes.rows,
  };
}

// ============================================================
// Recent Activity
// ============================================================

/**
 * Get recent activity from the vendor audit log.
 * Returns the most recent entries (default 20).
 */
export async function getRecentActivity(
  tenantId: string,
  limit: number = 20
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".vendor_audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  )).rows;
}
