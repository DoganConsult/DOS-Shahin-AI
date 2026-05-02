// ============================================
// Shahin-Ai — Privacy Reporting
// DSR status dashboards, breach stats, consent rates,
// DPIA reports, compliance metrics, regulatory submissions
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';

// === Types ===

export interface DsrDashboard {
  total: number;
  byStatus: Record<string, number>;
  byRequestType: Record<string, number>;
  overdue: number;
  avgResolutionDays: number | null;
  slaBreachRate: number;
}

export interface BreachDashboard {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  regulatorNotificationPending: number;
  avgContainmentHours: number | null;
  last30Days: number;
}

export interface ConsentDashboard {
  totalConsents: number;
  activeConsents: number;
  withdrawnConsents: number;
  expiredConsents: number;
  consentRate: number;
  byPurpose: Record<string, number>;
}

export interface PrivacyComplianceMetrics {
  generatedAt: string;
  tenantId: string;
  dsr: DsrDashboard;
  breaches: BreachDashboard;
  consent: ConsentDashboard;
  openDpias: number;
  crossBorderTransfersApproved: number;
  ropaActivitiesCount: number;
}

// === Pure Functions ===

export function computeSlaBreachRate(total: number, overdue: number): number {
  if (total === 0) return 0;
  return Math.round((overdue / total) * 100 * 10) / 10;
}

export function computeConsentRate(totalSubjects: number, activeConsents: number): number {
  if (totalSubjects === 0) return 0;
  return Math.round((activeConsents / totalSubjects) * 100 * 10) / 10;
}

export function groupByField<T>(items: T[], field: keyof T): Record<string, number> {
  return items.reduce((acc, item) => {
    const key = String(item[field]);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// === DB Functions ===

export async function getDsrDashboard(tenantId: string): Promise<DsrDashboard> {
  const schema = tenantSchema(tenantId);

  const [statusResult, overdueResult, avgResult] = await Promise.all([
    safeQuery(
      `SELECT status, request_type, COUNT(*) as cnt FROM "${schema}".privacy_privacy
       WHERE deleted_at IS NULL AND data_subject_email != 'breach@internal'
         AND data_subject_email != 'ropa@internal' AND data_subject_email != 'transfer@internal'
       GROUP BY status, request_type`,
      []
    ),
    safeQuery(
      `SELECT COUNT(*) as cnt FROM "${schema}".privacy_privacy
       WHERE deleted_at IS NULL AND status NOT IN ('completed','rejected')
         AND due_date IS NOT NULL AND due_date < NOW()
         AND data_subject_email NOT IN ('breach@internal','ropa@internal','transfer@internal')`,
      []
    ),
    safeQuery(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days
       FROM "${schema}".privacy_privacy
       WHERE deleted_at IS NULL AND status = 'completed'
         AND data_subject_email NOT IN ('breach@internal','ropa@internal','transfer@internal')`,
      []
    ),
  ]);

  const byStatus: Record<string, number> = {};
  const byRequestType: Record<string, number> = {};
  let total = 0;

  for (const row of statusResult.rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + parseInt(row.cnt, 10);
    byRequestType[row.request_type] = (byRequestType[row.request_type] || 0) + parseInt(row.cnt, 10);
    total += parseInt(row.cnt, 10);
  }

  const overdue = parseInt(overdueResult.rows[0]?.cnt || "0", 10);
  const avgDays = avgResult.rows[0]?.avg_days ? Math.round(parseFloat(avgResult.rows[0].avg_days) * 10) / 10 : null;

  return {
    total,
    byStatus,
    byRequestType,
    overdue,
    avgResolutionDays: avgDays,
    slaBreachRate: computeSlaBreachRate(total, overdue),
  };
}

export async function getBreachDashboard(tenantId: string): Promise<BreachDashboard> {
  const schema = tenantSchema(tenantId);

  const [allBreaches, last30] = await Promise.all([
    safeQuery(
      `SELECT status, metadata FROM "${schema}".privacy_privacy
       WHERE deleted_at IS NULL AND data_subject_email = 'breach@internal'`,
      []
    ),
    safeQuery(
      `SELECT COUNT(*) as cnt FROM "${schema}".privacy_privacy
       WHERE deleted_at IS NULL AND data_subject_email = 'breach@internal'
         AND created_at >= NOW() - INTERVAL '30 days'`,
      []
    ),
  ]);

  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let regulatorPending = 0;

  for (const row of allBreaches.rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    const severity = row.metadata?.severity || "medium";
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    if (row.metadata?.regulatorNotificationRequired && !row.metadata?.regulatorNotifiedAt) {
      regulatorPending++;
    }
  }

  return {
    total: allBreaches.rows.length,
    byStatus,
    bySeverity,
    regulatorNotificationPending: regulatorPending,
    avgContainmentHours: null,
    last30Days: parseInt(last30.rows[0]?.cnt || "0", 10),
  };
}

export async function getConsentDashboard(tenantId: string): Promise<ConsentDashboard> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT status, metadata->>'purpose' as purpose, COUNT(*) as cnt
     FROM "${schema}".privacy_privacy
     WHERE deleted_at IS NULL
       AND data_subject_email NOT IN ('breach@internal','ropa@internal','transfer@internal')
       AND title LIKE 'Consent:%'
     GROUP BY status, metadata->>'purpose'`,
    []
  );

  const byStatus: Record<string, number> = {};
  const byPurpose: Record<string, number> = {};

  for (const row of result.rows) {
    const count = parseInt(row.cnt, 10);
    byStatus[row.status] = (byStatus[row.status] || 0) + count;
    if (row.purpose) byPurpose[row.purpose] = (byPurpose[row.purpose] || 0) + count;
  }

  const total = Object.values(byStatus).reduce((s, v) => s + v, 0);
  const active = byStatus.active || 0;

  return {
    totalConsents: total,
    activeConsents: active,
    withdrawnConsents: byStatus.withdrawn || 0,
    expiredConsents: byStatus.expired || 0,
    consentRate: computeConsentRate(total, active),
    byPurpose,
  };
}

export async function getPrivacyComplianceMetrics(tenantId: string): Promise<PrivacyComplianceMetrics> {
  const schema = tenantSchema(tenantId);

  const [dsr, breaches, consent, dpiaResult, transferResult, ropaResult] = await Promise.all([
    getDsrDashboard(tenantId),
    getBreachDashboard(tenantId),
    getConsentDashboard(tenantId),
    safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".privacy_privacy WHERE deleted_at IS NULL AND status IN ('draft','in_review') AND metadata->>'projectName' IS NOT NULL`, []),
    safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".privacy_privacy WHERE deleted_at IS NULL AND status = 'approved' AND data_subject_email = 'transfer@internal'`, []),
    safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".privacy_privacy WHERE deleted_at IS NULL AND status = 'active' AND data_subject_email = 'ropa@internal'`, []),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    dsr,
    breaches,
    consent,
    openDpias: parseInt(dpiaResult.rows[0]?.cnt || "0", 10),
    crossBorderTransfersApproved: parseInt(transferResult.rows[0]?.cnt || "0", 10),
    ropaActivitiesCount: parseInt(ropaResult.rows[0]?.cnt || "0", 10),
  };
}

export async function getDsrAgingReport(tenantId: string): Promise<Array<{
  bucket: string; count: number; avgDays: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       CASE
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 7 THEN '0-7 days'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 14 THEN '8-14 days'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 30 THEN '15-30 days'
         ELSE '30+ days'
       END as bucket,
       COUNT(*) as count,
       AVG(EXTRACT(DAY FROM NOW() - created_at)) as avg_days
     FROM "${schema}".privacy_privacy
     WHERE deleted_at IS NULL AND status NOT IN ('completed','rejected')
       AND data_subject_email NOT IN ('breach@internal','ropa@internal','transfer@internal')
     GROUP BY bucket ORDER BY avg_days`,
    []
  );
  return result.rows.map(r => ({
    bucket: r.bucket,
    count: parseInt(r.count, 10),
    avgDays: Math.round(parseFloat(r.avg_days) * 10) / 10,
  }));
}
