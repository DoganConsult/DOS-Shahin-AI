// ============================================
// Issues — Reporting Service
// Dashboards, trends, aging, SLA compliance, MTTR
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { ISSUES_SLA_DEFAULTS } from '../data/issues-constants';

// === Types ===

export interface IssuesDashboard {
  totalOpen: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byAssignee: Array<{ userId: string; count: number }>;
  slaBreachCount: number;
  overdueCount: number;
}

export interface TrendPoint {
  period: string;
  created: number;
  resolved: number;
  net: number;
}

export interface AgingBucket {
  bucket: string;
  count: number;
  avgAgeDays: number;
}

export interface SlaComplianceReport {
  severity: string;
  slaHours: number;
  total: number;
  withinSla: number;
  breached: number;
  compliancePercent: number;
}

// === Pure Functions ===

export function computeAgeBucket(ageHours: number): string {
  if (ageHours < 24) return '<1d';
  if (ageHours < 72) return '1-3d';
  if (ageHours < 168) return '3-7d';
  if (ageHours < 720) return '7-30d';
  return '>30d';
}

export function computeSlaCompliance(records: Array<{ createdAt: Date; resolvedAt?: Date; severity: string }>): SlaComplianceReport[] {
  const bySeverity: Record<string, { total: number; withinSla: number }> = {};

  for (const rec of records) {
    const slaHours = ISSUES_SLA_DEFAULTS[rec.severity as keyof typeof ISSUES_SLA_DEFAULTS] ?? 168;
    if (!bySeverity[rec.severity]) bySeverity[rec.severity] = { total: 0, withinSla: 0 };
    bySeverity[rec.severity].total++;
    if (rec.resolvedAt) {
      const hours = (rec.resolvedAt.getTime() - rec.createdAt.getTime()) / (1000 * 60 * 60);
      if (hours <= slaHours) bySeverity[rec.severity].withinSla++;
    }
  }

  return Object.entries(bySeverity).map(([severity, data]) => ({
    severity,
    slaHours: ISSUES_SLA_DEFAULTS[severity as keyof typeof ISSUES_SLA_DEFAULTS] ?? 168,
    total: data.total,
    withinSla: data.withinSla,
    breached: data.total - data.withinSla,
    compliancePercent: data.total > 0 ? Math.round((data.withinSla / data.total) * 100) : 100,
  }));
}

// === DB-backed Functions ===

export async function getIssuesDashboard(tenantId: string): Promise<IssuesDashboard> {
  const schema = tenantSchema(tenantId);

  const [severityRes, statusRes, categoryRes, assigneeRes, slaRes, overdueRes] = await Promise.all([
    safeQuery(
      `SELECT severity, COUNT(*) AS cnt FROM "${schema}".issues WHERE status NOT IN ('closed','archived') AND deleted_at IS NULL GROUP BY severity`,
      []
    ),
    safeQuery(
      `SELECT status, COUNT(*) AS cnt FROM "${schema}".issues WHERE deleted_at IS NULL GROUP BY status`,
      []
    ),
    safeQuery(
      `SELECT category, COUNT(*) AS cnt FROM "${schema}".issues WHERE deleted_at IS NULL GROUP BY category ORDER BY cnt DESC LIMIT 20`,
      []
    ),
    safeQuery(
      `SELECT assigned_to AS user_id, COUNT(*) AS cnt FROM "${schema}".issues WHERE assigned_to IS NOT NULL AND status NOT IN ('closed','archived') AND deleted_at IS NULL GROUP BY assigned_to ORDER BY cnt DESC LIMIT 20`,
      []
    ),
    safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".issues
       WHERE status NOT IN ('closed','archived','resolved') AND deleted_at IS NULL
         AND (metadata->>'sla_breached')::boolean = true`,
      []
    ),
    safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".issues WHERE due_date < NOW() AND status NOT IN ('closed','archived','resolved') AND deleted_at IS NULL`,
      []
    ),
  ]);

  const bySeverity: Record<string, number> = {};
  for (const r of severityRes.rows) bySeverity[r.severity] = parseInt(r.cnt, 10);

  const byStatus: Record<string, number> = {};
  for (const r of statusRes.rows) byStatus[r.status] = parseInt(r.cnt, 10);

  const byCategory: Record<string, number> = {};
  for (const r of categoryRes.rows) byCategory[r.category] = parseInt(r.cnt, 10);

  const totalOpen = Object.entries(byStatus)
    .filter(([s]) => !['closed', 'archived'].includes(s))
    .reduce((acc, [, n]) => acc + n, 0);

  return {
    totalOpen,
    bySeverity,
    byStatus,
    byCategory,
    byAssignee: assigneeRes.rows.map(r => ({ userId: r.user_id, count: parseInt(r.cnt, 10) })),
    slaBreachCount: parseInt(getFirstRow(slaRes)?.cnt ?? '0', 10),
    overdueCount: parseInt(getFirstRow(overdueRes)?.cnt ?? '0', 10),
  };
}

export async function getIssueTrends(
  tenantId: string,
  periodDays: number = 30,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<TrendPoint[]> {
  const schema = tenantSchema(tenantId);
  const truncUnit = granularity === 'month' ? 'month' : granularity === 'week' ? 'week' : 'day';
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const [createdRes, resolvedRes] = await Promise.all([
    safeQuery(
      `SELECT date_trunc($1, created_at) AS period, COUNT(*) AS cnt
       FROM "${schema}".issues WHERE created_at >= $2 AND deleted_at IS NULL
       GROUP BY period ORDER BY period`,
      [truncUnit, since]
    ),
    safeQuery(
      `SELECT date_trunc($1, updated_at) AS period, COUNT(*) AS cnt
       FROM "${schema}".issues WHERE updated_at >= $2 AND status IN ('resolved','closed') AND deleted_at IS NULL
       GROUP BY period ORDER BY period`,
      [truncUnit, since]
    ),
  ]);

  const map = new Map<string, TrendPoint>();

  for (const r of createdRes.rows) {
    const key = new Date(r.period).toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, { period: key, created: 0, resolved: 0, net: 0 });
    map.get(key)!.created = parseInt(r.cnt, 10);
  }
  for (const r of resolvedRes.rows) {
    const key = new Date(r.period).toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, { period: key, created: 0, resolved: 0, net: 0 });
    map.get(key)!.resolved = parseInt(r.cnt, 10);
  }

  const points = Array.from(map.values()).map(p => ({ ...p, net: p.created - p.resolved }));
  points.sort((a, b) => a.period.localeCompare(b.period));
  return points;
}

export async function getAgingReport(tenantId: string): Promise<AgingBucket[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
     FROM "${schema}".issues
     WHERE status NOT IN ('closed','archived','resolved') AND deleted_at IS NULL`,
    []
  );

  const buckets = new Map<string, { count: number; totalHours: number }>();

  for (const r of result.rows) {
    const ageHours = parseFloat(r.age_hours);
    const bucket = computeAgeBucket(ageHours);
    if (!buckets.has(bucket)) buckets.set(bucket, { count: 0, totalHours: 0 });
    const b = buckets.get(bucket)!;
    b.count++;
    b.totalHours += ageHours;
  }

  const ORDER = ['<1d', '1-3d', '3-7d', '7-30d', '>30d'];
  return ORDER
    .filter(k => buckets.has(k))
    .map(bucket => {
      const b = buckets.get(bucket)!;
      return { bucket, count: b.count, avgAgeDays: b.count > 0 ? Math.round((b.totalHours / b.count) / 24 * 10) / 10 : 0 };
    });
}

export async function getSlaComplianceReport(tenantId: string): Promise<SlaComplianceReport[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT severity, created_at, updated_at, status
     FROM "${schema}".issues
     WHERE deleted_at IS NULL`,
    []
  );

  const records = result.rows.map(r => ({
    severity: r.severity,
    createdAt: new Date(r.created_at),
    resolvedAt: ['resolved', 'closed'].includes(r.status) ? new Date(r.updated_at) : undefined,
  }));

  return computeSlaCompliance(records);
}
