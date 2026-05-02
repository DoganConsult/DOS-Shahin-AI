// ============================================
// Shahin — Action Reporting Service
// Action item dashboards by source/assignee/status,
// completion rates, SLA reports,
// average resolution time, aging analysis
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';

// === Types ===

export interface ActionDashboard {
  totalItems: number;
  pendingItems: number;
  inProgressItems: number;
  completedItems: number;
  overdueItems: number;
  cancelledItems: number;
  completionRate: number;
  overdueRate: number;
}

export interface ActionsBySource {
  sourceType: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export interface ActionsByAssignee {
  assignedTo: string;
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completionRate: number;
  averageResolutionDays: number | null;
}

export interface ResolutionTimeStat {
  sourceType: string | null;
  averageDays: number;
  medianDays: number | null;
  minDays: number;
  maxDays: number;
  count: number;
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  count: number;
}

export interface SlaComplianceReport {
  totalWithDeadline: number;
  onTime: number;
  overdue: number;
  complianceRate: number;
  averageDaysToDeadline: number | null;
}

// === Pure Functions ===

export function computeCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function buildAgingBuckets(
  items: { daysOpen: number }[]
): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: '0-7 days', minDays: 0, maxDays: 7, count: 0 },
    { label: '8-30 days', minDays: 8, maxDays: 30, count: 0 },
    { label: '31-90 days', minDays: 31, maxDays: 90, count: 0 },
    { label: '90+ days', minDays: 91, maxDays: null, count: 0 },
  ];
  for (const item of items) {
    const bucket = buckets.find(b => item.daysOpen >= b.minDays && (b.maxDays === null || item.daysOpen <= b.maxDays));
    if (bucket) bucket.count++;
  }
  return buckets;
}

// === Dashboards ===

export async function getActionDashboard(
  tenantId: string,
  filters?: { assignedTo?: string; sourceType?: string }
): Promise<ActionDashboard> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.assignedTo) { conditions.push(`assigned_to = $${idx++}`); params.push(filters.assignedTo); }
  if (filters?.sourceType) { conditions.push(`source_type = $${idx++}`); params.push(filters.sourceType); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
     FROM "${schema}".action_items ${where}`,
    params
  );

  const r = getFirstRow(result)!;
  const total = parseInt(r?.total || '0', 10);
  const completed = parseInt(r?.completed || '0', 10);
  const overdue = parseInt(r?.overdue || '0', 10);

  return {
    totalItems: total,
    pendingItems: parseInt(r?.pending || '0', 10),
    inProgressItems: parseInt(r?.in_progress || '0', 10),
    completedItems: completed,
    overdueItems: overdue,
    cancelledItems: parseInt(r?.cancelled || '0', 10),
    completionRate: computeCompletionRate(completed, total),
    overdueRate: computeCompletionRate(overdue, total),
  };
}

export async function getActionsBySource(tenantId: string): Promise<ActionsBySource[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       source_type,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue
     FROM "${schema}".action_items
     GROUP BY source_type
     ORDER BY total DESC`,
    []
  );

  return result.rows.map((r: Record<string, unknown>) => {
    const total = Number(r.total) || 0;
    const completed = Number(r.completed) || 0;
    return {
      sourceType: typeof r.source_type === 'string' ? r.source_type : 'unknown',
      total,
      pending: Number(r.pending) || 0,
      inProgress: Number(r.in_progress) || 0,
      completed,
      overdue: Number(r.overdue) || 0,
      completionRate: computeCompletionRate(completed, total),
    };
  });
}

export async function getActionsByAssignee(tenantId: string): Promise<ActionsByAssignee[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       assigned_to,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       AVG(CASE WHEN status = 'completed' AND created_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 ELSE NULL END) AS avg_resolution_days
     FROM "${schema}".action_items
     GROUP BY assigned_to
     ORDER BY total DESC`,
    []
  );

  return result.rows.map((r: Record<string, unknown>) => {
    const total = Number(r.total) || 0;
    const completed = Number(r.completed) || 0;
    return {
      assignedTo: typeof r.assigned_to === 'string' ? r.assigned_to : '',
      total,
      completed,
      overdue: Number(r.overdue) || 0,
      inProgress: Number(r.in_progress) || 0,
      completionRate: computeCompletionRate(completed, total),
      averageResolutionDays: r.avg_resolution_days ? Math.round(Number(r.avg_resolution_days) || 0) : null,
    };
  });
}

export async function getResolutionTimeStats(tenantId: string): Promise<ResolutionTimeStat[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       source_type,
       AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS avg_days,
       MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS min_days,
       MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS max_days,
       COUNT(*) AS cnt
     FROM "${schema}".action_items
     WHERE status = 'completed' AND updated_at IS NOT NULL
     GROUP BY source_type
     ORDER BY avg_days DESC`,
    []
  );

  return result.rows.map((r: Record<string, unknown>) => ({
    sourceType: typeof r.source_type === 'string' ? r.source_type : null,
    averageDays: Math.round(Number(r.avg_days) || 0),
    medianDays: null,
    minDays: Math.round(Number(r.min_days) || 0),
    maxDays: Math.round(Number(r.max_days) || 0),
    count: Number(r.cnt) || 0,
  }));
}

export async function getAgingAnalysis(
  tenantId: string,
  assignedTo?: string
): Promise<AgingBucket[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [];
  const extra = assignedTo ? `AND assigned_to = $1` : '';
  if (assignedTo) params.push(assignedTo);

  const result = await safeQuery(
    `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_open
     FROM "${schema}".action_items
     WHERE status NOT IN ('completed', 'cancelled') ${extra}`,
    params
  );

  const items = result.rows.map(( r: Record<string, unknown>) => ({ daysOpen: Math.floor(parseFloat((r as any).days_open) || 0) }));
  return buildAgingBuckets(items);
}

export async function getSlaComplianceReport(
  tenantId: string,
  filters?: { assignedTo?: string; sourceType?: string }
): Promise<SlaComplianceReport> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deadline IS NOT NULL`];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.assignedTo) { conditions.push(`assigned_to = $${idx++}`); params.push(filters.assignedTo); }
  if (filters?.sourceType) { conditions.push(`source_type = $${idx++}`); params.push(filters.sourceType); }

  const result = await safeQuery(
    `SELECT
       COUNT(*) AS total_with_deadline,
       COUNT(*) FILTER (WHERE status = 'completed' AND updated_at::date <= deadline::date) AS on_time,
       COUNT(*) FILTER (WHERE status = 'overdue' OR (deadline::date < NOW()::date AND status NOT IN ('completed','cancelled'))) AS overdue,
       AVG(EXTRACT(EPOCH FROM (deadline::timestamptz - NOW())) / 86400)
         FILTER (WHERE status NOT IN ('completed','cancelled')) AS avg_days_to_deadline
     FROM "${schema}".action_items
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  const r = getFirstRow(result)!;
  const total = parseInt(r?.total_with_deadline || '0', 10);
  const onTime = parseInt(r?.on_time || '0', 10);
  const overdue = parseInt(r?.overdue || '0', 10);

  return {
    totalWithDeadline: total,
    onTime,
    overdue,
    complianceRate: computeCompletionRate(onTime, total),
    averageDaysToDeadline: r?.avg_days_to_deadline ? Math.round(parseFloat(r.avg_days_to_deadline)) : null,
  };
}
