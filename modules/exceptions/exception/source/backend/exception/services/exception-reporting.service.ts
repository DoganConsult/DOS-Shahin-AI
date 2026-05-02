import { safeQuery, tenantSchema } from '../ports/database.port';

// === Types ===

export interface ExceptionStatusDashboard {
  total: number;
  byStatus: Record<string, number>;
  byRiskLevel: Record<string, number>;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  avgDurationDays: number | null;
  avgAgeApprovedDays: number | null;
}

export interface ExpiryCalendarEntry {
  exceptionId: string;
  controlId: string | null;
  expiryDate: string;
  riskImpact: string;
  daysUntilExpiry: number;
  urgency: "green" | "yellow" | "red" | "overdue";
}

export interface ExceptionAgingBucket {
  bucket: string;
  count: number;
  avgAgeDays: number;
  byRiskLevel: Record<string, number>;
}

export interface ExceptionUtilizationMetrics {
  tenantId: string;
  generatedAt: string;
  totalExceptions: number;
  activeExceptionsRate: number;
  avgExceptionDurationDays: number | null;
  topControlsWithExceptions: Array<{ controlId: string; count: number }>;
  byApproverDesignation: Record<string, number>;
  renewalRate: number;
}

// === Pure Functions ===

export function classifyExpiryUrgency(daysUntilExpiry: number): ExpiryCalendarEntry["urgency"] {
  if (daysUntilExpiry < 0) return "overdue";
  if (daysUntilExpiry <= 7) return "red";
  if (daysUntilExpiry <= 30) return "yellow";
  return "green";
}

export function computeUtilizationRate(approved: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((approved / total) * 100 * 10) / 10;
}

// === DB Functions ===

export async function getExceptionDashboard(tenantId: string): Promise<ExceptionStatusDashboard> {
  const schema = tenantSchema(tenantId);

  const [statusResult, avgResult] = await Promise.all([
    safeQuery(
      `SELECT status, risk_impact, COUNT(*) as cnt
       FROM "${schema}".exceptions
       GROUP BY status, risk_impact`,
      []
    ),
    safeQuery(
      `SELECT
         AVG(requested_duration) as avg_duration,
         AVG(EXTRACT(DAY FROM NOW() - created_at)) FILTER (WHERE status = 'approved') as avg_age_approved
       FROM "${schema}".exceptions`,
      []
    ),
  ]);

  const byStatus: Record<string, number> = {};
  const byRiskLevel: Record<string, number> = {};
  let total = 0;

  for (const row of statusResult.rows) {
    const cnt = parseInt(row.cnt, 10);
    byStatus[row.status] = (byStatus[row.status] || 0) + cnt;
    byRiskLevel[row.risk_impact] = (byRiskLevel[row.risk_impact] || 0) + cnt;
    total += cnt;
  }

  const avgRow = avgResult.rows[0];
  return {
    total,
    byStatus,
    byRiskLevel,
    pending: byStatus.pending || 0,
    approved: byStatus.approved || 0,
    rejected: byStatus.rejected || 0,
    expired: byStatus.expired || 0,
    avgDurationDays: avgRow?.avg_duration ? Math.round(parseFloat(avgRow.avg_duration) * 10) / 10 : null,
    avgAgeApprovedDays: avgRow?.avg_age_approved ? Math.round(parseFloat(avgRow.avg_age_approved) * 10) / 10 : null,
  };
}

export async function getExpiryCalendar(
  tenantId: string,
  daysAhead = 90
): Promise<ExpiryCalendarEntry[]> {
  const schema = tenantSchema(tenantId);
  const threshold = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();

  const result = await safeQuery(
    `SELECT exception_id, control_id, expiry_date, risk_impact
     FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= $1
     ORDER BY expiry_date ASC`,
    [threshold]
  );

  return result.rows.map(r => {
    const expiryDate = new Date(r.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      exceptionId: r.exception_id,
      controlId: r.control_id || null,
      expiryDate: expiryDate.toISOString(),
      riskImpact: r.risk_impact,
      daysUntilExpiry,
      urgency: classifyExpiryUrgency(daysUntilExpiry),
    };
  });
}

export async function getAgingReport(tenantId: string): Promise<ExceptionAgingBucket[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       CASE
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 30 THEN '0-30 days'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 60 THEN '31-60 days'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 90 THEN '61-90 days'
         ELSE '90+ days'
       END as bucket,
       risk_impact,
       COUNT(*) as cnt,
       AVG(EXTRACT(DAY FROM NOW() - created_at)) as avg_age
     FROM "${schema}".exceptions
     WHERE status NOT IN ('expired', 'rejected')
     GROUP BY bucket, risk_impact
     ORDER BY avg_age`,
    []
  );

  const bucketMap: Record<string, ExceptionAgingBucket> = {};
  for (const row of result.rows) {
    if (!bucketMap[row.bucket]) {
      bucketMap[row.bucket] = { bucket: row.bucket, count: 0, avgAgeDays: parseFloat(row.avg_age), byRiskLevel: {} };
    }
    const cnt = parseInt(row.cnt, 10);
    bucketMap[row.bucket].count += cnt;
    bucketMap[row.bucket].byRiskLevel[row.risk_impact] = (bucketMap[row.bucket].byRiskLevel[row.risk_impact] || 0) + cnt;
  }

  return Object.values(bucketMap).map(b => ({ ...b, avgAgeDays: Math.round(b.avgAgeDays * 10) / 10 }));
}

export async function getExceptionUtilizationMetrics(tenantId: string): Promise<ExceptionUtilizationMetrics> {
  const schema = tenantSchema(tenantId);

  const [dashboard, topControls, approverResult, renewalResult] = await Promise.all([
    getExceptionDashboard(tenantId),
    safeQuery(
      `SELECT control_id, COUNT(*) as cnt FROM "${schema}".exceptions
       WHERE control_id IS NOT NULL GROUP BY control_id ORDER BY cnt DESC LIMIT 5`,
      []
    ),
    safeQuery(
      `SELECT approver_designation, COUNT(*) as cnt FROM "${schema}".exceptions GROUP BY approver_designation`,
      []
    ),
    safeQuery(
      `SELECT CASE WHEN COUNT(DISTINCT e.exception_id) > 0
        THEN ROUND(COUNT(DISTINCT r.exception_id)::numeric / COUNT(DISTINCT e.exception_id)::numeric * 100, 2)
        ELSE 0
      END AS renewal_rate
      FROM "${schema}".exceptions e
      LEFT JOIN "${schema}".exception_renewals r ON r.exception_id = e.exception_id
      WHERE e.status NOT IN ('expired', 'rejected')`,
      []
    ).catch(() => ({ rows: [{ renewal_rate: 0 }] })),
  ]);

  const byApproverDesignation: Record<string, number> = {};
  for (const row of approverResult.rows) {
    byApproverDesignation[row.approver_designation] = parseInt(row.cnt, 10);
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalExceptions: dashboard.total,
    activeExceptionsRate: computeUtilizationRate(dashboard.approved, dashboard.total),
    avgExceptionDurationDays: dashboard.avgDurationDays,
    topControlsWithExceptions: topControls.rows.map(r => ({ controlId: r.control_id, count: parseInt(r.cnt, 10) })),
    byApproverDesignation,
    renewalRate: Number(renewalResult.rows[0]?.renewal_rate) || 0,
  };
}

export async function getExceptionsByRiskLevel(
  tenantId: string
): Promise<Array<{ riskLevel: string; count: number; avgAge: number; expiringIn30Days: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       risk_impact,
       COUNT(*) as total,
       AVG(EXTRACT(DAY FROM NOW() - created_at)) as avg_age,
       COUNT(*) FILTER (WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '30 days') as expiring_30
     FROM "${schema}".exceptions
     WHERE status NOT IN ('expired', 'rejected')
     GROUP BY risk_impact
     ORDER BY
       CASE risk_impact WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
    []
  );
  return result.rows.map(r => ({
    riskLevel: r.risk_impact,
    count: parseInt(r.total, 10),
    avgAge: Math.round(parseFloat(r.avg_age || "0") * 10) / 10,
    expiringIn30Days: parseInt(r.expiring_30, 10),
  }));
}
