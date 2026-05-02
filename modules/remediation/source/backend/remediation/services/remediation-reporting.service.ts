// ============================================
// Shahin — Remediation Reporting Service
// Progress dashboards, SLA compliance,
// trend analysis, cost tracking,
// executive summary generation
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';

// === Types ===

export interface PlanDashboard {
  planId: string;
  title: string;
  ownerId: string;
  status: string;
  percentageComplete: number;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  openBlockers: number;
  estimatedCost: number | null;
  targetDate: string | null;
  daysRemaining: number | null;
  slaCompliant: boolean;
}

export interface OwnerSummary {
  ownerId: string;
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  averageCompletion: number;
  totalOverdueMilestones: number;
  slaBreachCount: number;
}

export interface SlaReport {
  totalPlans: number;
  compliantPlans: number;
  nonCompliantPlans: number;
  complianceRate: number;
  averageDaysOverdue: number;
  breachedByOwner: { ownerId: string; count: number }[];
}

export interface TrendPoint {
  month: string;
  created: number;
  completed: number;
  averageDays: number | null;
}

export interface CostSummary {
  totalEstimated: number;
  currency: string;
  byStatus: Record<string, number>;
  byOwner: { ownerId: string; estimated: number }[];
}

export interface ExecutiveSummary {
  generatedAt: string;
  totalPlans: number;
  completedPlans: number;
  inProgressPlans: number;
  overdueItems: number;
  slaComplianceRate: number;
  totalEstimatedCost: number;
  topRisks: string[];
  highlights: string[];
}

// === Pure Functions ===

export function computeSlaCompliance(
  targetDate: string | null,
  status: string,
  now: Date = new Date()
): boolean {
  if (status === 'completed') return true;
  if (!targetDate) return true;
  return new Date(targetDate) >= now;
}

export function buildHighlights(
  totalPlans: number,
  completedPlans: number,
  overdueItems: number,
  slaRate: number
): string[] {
  const highlights: string[] = [];
  const completionRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;
  highlights.push(`${completionRate}% plan completion rate (${completedPlans}/${totalPlans} plans)`);
  if (overdueItems > 0) highlights.push(`${overdueItems} overdue milestone(s) require attention`);
  if (slaRate >= 90) highlights.push(`SLA compliance is strong at ${slaRate}%`);
  else if (slaRate < 70) highlights.push(`SLA compliance is below threshold at ${slaRate}%`);
  return highlights;
}

// === Dashboards ===

export async function getPlanDashboards(
  tenantId: string,
  filters?: { ownerId?: string; status?: string }
): Promise<PlanDashboard[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.ownerId) { conditions.push(`rp.owner_id = $${idx++}`); params.push(filters.ownerId); }
  if (filters?.status) { conditions.push(`rp.status = $${idx++}`); params.push(filters.status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT
       rp.plan_id, rp.title, rp.owner_id, rp.status,
       rp.estimated_cost, rp.target_date,
       COUNT(rm.milestone_id) AS total_milestones,
       COUNT(rm.milestone_id) FILTER (WHERE rm.status = 'completed') AS completed_milestones,
       COUNT(rm.milestone_id) FILTER (WHERE rm.status = 'overdue') AS overdue_milestones,
       (SELECT COUNT(*) FROM "${schema}".remediation_blockers rb
        WHERE rb.plan_id = rp.plan_id AND rb.status = 'open') AS open_blockers
     FROM "${schema}".remediation_plans rp
     LEFT JOIN "${schema}".remediation_milestones rm ON rm.plan_id = rp.plan_id
     ${where}
     GROUP BY rp.plan_id, rp.title, rp.owner_id, rp.status, rp.estimated_cost, rp.target_date
     ORDER BY rp.created_at DESC`,
    params
  );

  const now = new Date();

  return result.rows.map(( r: Record<string, unknown>) => {
    const total = parseInt((r as any).total_milestones, 10);
    const completed = parseInt((r as any).completed_milestones, 10);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const targetDate = r.target_date?.toISOString?.().split('T')[0] || r.target_date || null;
    const daysRemaining = targetDate
      ? Math.ceil((new Date(targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      planId: r.plan_id,
      title: r.title,
      ownerId: r.owner_id,
      status: r.status,
      percentageComplete: pct,
      totalMilestones: total,
      completedMilestones: completed,
      overdueMilestones: parseInt((r as any).overdue_milestones, 10),
      openBlockers: parseInt((r as any).open_blockers, 10),
      estimatedCost: r.estimated_cost ? parseFloat((r as any).estimated_cost) : null,
      targetDate,
      daysRemaining,
      slaCompliant: computeSlaCompliance(targetDate, (r as any).status, now),
    };
  });
}

export async function getOwnerSummaries(
  tenantId: string
): Promise<OwnerSummary[]> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString().split('T')[0];

  const result = await safeQuery(
    `SELECT
       rp.owner_id,
       COUNT(*) AS total_plans,
       COUNT(*) FILTER (WHERE rp.status IN ('approved', 'in_progress')) AS active_plans,
       COUNT(*) FILTER (WHERE rp.status = 'completed') AS completed_plans,
       COALESCE(AVG(
         CASE WHEN (
           SELECT COUNT(*) FROM "${schema}".remediation_milestones rm WHERE rm.plan_id = rp.plan_id
         ) > 0 THEN (
           SELECT COUNT(*) FILTER (WHERE rm2.status = 'completed') * 100.0 /
                  NULLIF(COUNT(*), 0)
           FROM "${schema}".remediation_milestones rm2 WHERE rm2.plan_id = rp.plan_id
         ) ELSE 0 END
       ), 0) AS avg_completion,
       (SELECT COUNT(*) FROM "${schema}".remediation_milestones rm3
        WHERE rm3.plan_id = ANY(ARRAY_AGG(rp.plan_id))
          AND rm3.status != 'completed' AND rm3.due_date < $1) AS total_overdue,
       COUNT(*) FILTER (WHERE rp.target_date < $1 AND rp.status NOT IN ('completed')) AS sla_breaches
     FROM "${schema}".remediation_plans rp
     GROUP BY rp.owner_id
     ORDER BY total_plans DESC`,
    [now]
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    ownerId: r.owner_id,
    totalPlans: parseInt((r as any).total_plans, 10),
    activePlans: parseInt((r as any).active_plans, 10),
    completedPlans: parseInt((r as any).completed_plans, 10),
    averageCompletion: Math.round(parseFloat((r as any).avg_completion) || 0),
    totalOverdueMilestones: parseInt((r as any).total_overdue, 10),
    slaBreachCount: parseInt((r as any).sla_breaches, 10),
  }));
}

export async function getSlaReport(tenantId: string): Promise<SlaReport> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString().split('T')[0];

  const totalsResult = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE target_date >= $1 OR status = 'completed' OR target_date IS NULL) AS compliant,
       COUNT(*) FILTER (WHERE target_date < $1 AND status NOT IN ('completed')) AS non_compliant,
       AVG(CASE WHEN target_date < $1 AND status NOT IN ('completed')
           THEN EXTRACT(EPOCH FROM (NOW() - target_date)) / 86400 ELSE NULL END) AS avg_days_overdue
     FROM "${schema}".remediation_plans`,
    [now]
  );

  const byOwnerResult = await safeQuery(
    `SELECT owner_id, COUNT(*) AS breach_count
     FROM "${schema}".remediation_plans
     WHERE target_date < $1 AND status NOT IN ('completed')
     GROUP BY owner_id ORDER BY breach_count DESC LIMIT 10`,
    [now]
  );

  const t = getFirstRow(totalsResult)!;
  const total = parseInt(t?.total || '0', 10);
  const compliant = parseInt(t?.compliant || '0', 10);
  const nonCompliant = parseInt(t?.non_compliant || '0', 10);

  return {
    totalPlans: total,
    compliantPlans: compliant,
    nonCompliantPlans: nonCompliant,
    complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 100,
    averageDaysOverdue: Math.round(parseFloat(t?.avg_days_overdue || '0') || 0),

    breachedByOwner: byOwnerResult.rows.map(( r: Record<string, unknown>) => ({
      ownerId: r.owner_id,
      count: parseInt((r as any).breach_count, 10),
    })),
  };
}

export async function getTrends(
  tenantId: string,
  monthsBack: number = 6
): Promise<TrendPoint[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
       COUNT(*) AS created,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       AVG(CASE WHEN status = 'completed' AND updated_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 ELSE NULL END) AS avg_days
     FROM "${schema}".remediation_plans
     WHERE created_at >= NOW() - INTERVAL '${monthsBack} months'
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month ASC`,
    []
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    month: r.month,
    created: parseInt((r as any).created, 10),
    completed: parseInt((r as any).completed, 10),
    averageDays: r.avg_days ? Math.round(parseFloat((r as any).avg_days)) : null,
  }));
}

export async function getCostSummary(tenantId: string): Promise<CostSummary> {
  const schema = tenantSchema(tenantId);

  const [totalResult, byStatusResult, byOwnerResult] = await Promise.all([
    safeQuery(
      `SELECT COALESCE(SUM(estimated_cost), 0) AS total, MAX(currency) AS currency
       FROM "${schema}".remediation_plans WHERE estimated_cost IS NOT NULL`,
      []
    ),
    safeQuery(
      `SELECT status, COALESCE(SUM(estimated_cost), 0) AS total
       FROM "${schema}".remediation_plans WHERE estimated_cost IS NOT NULL
       GROUP BY status`,
      []
    ),
    safeQuery(
      `SELECT owner_id, COALESCE(SUM(estimated_cost), 0) AS total
       FROM "${schema}".remediation_plans WHERE estimated_cost IS NOT NULL
       GROUP BY owner_id ORDER BY total DESC LIMIT 10`,
      []
    ),
  ]);

  const t = getFirstRow(totalResult)!;
  const byStatus: Record<string, number> = {};
  for (const r of byStatusResult.rows as Record<string, unknown>[][]) {

    byStatus[r.status] = parseFloat(r.total);
  }

  return {
    totalEstimated: parseFloat(t?.total || '0'),
    currency: t?.currency || 'USD',
    byStatus,

    byOwner: byOwnerResult.rows.map(( r: Record<string, unknown>) => ({
      ownerId: r.owner_id,
      estimated: parseFloat((r as any).total),
    })),
  };
}

export async function getExecutiveSummary(tenantId: string): Promise<ExecutiveSummary> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const [planStats, overdueResult, costResult] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status IN ('approved', 'in_progress')) AS in_progress,
         COUNT(*) FILTER (WHERE target_date < $1 AND status NOT IN ('completed')) AS breached
       FROM "${schema}".remediation_plans`,
      [today]
    ),
    safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".remediation_milestones
       WHERE status NOT IN ('completed') AND due_date < $1`,
      [today]
    ),
    safeQuery(
      `SELECT COALESCE(SUM(estimated_cost), 0) AS total FROM "${schema}".remediation_plans`,
      []
    ),
  ]);

  const ps = getFirstRow(planStats)!;
  const total = parseInt(ps?.total || '0', 10);
  const completed = parseInt(ps?.completed || '0', 10);
  const inProgress = parseInt(ps?.in_progress || '0', 10);
  const breached = parseInt(ps?.breached || '0', 10);
  const overdueItems = parseInt(getFirstRow(overdueResult)?.cnt || '0', 10);
  const totalCost = parseFloat(getFirstRow(costResult)?.total || '0');
  const slaRate = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;

  return {
    generatedAt: now.toISOString(),
    totalPlans: total,
    completedPlans: completed,
    inProgressPlans: inProgress,
    overdueItems,
    slaComplianceRate: slaRate,
    totalEstimatedCost: totalCost,
    topRisks: overdueItems > 5
      ? [`${overdueItems} overdue milestones`, `${breached} SLA breaches`]
      : breached > 0
        ? [`${breached} SLA breaches`]
        : [],
    highlights: buildHighlights(total, completed, overdueItems, slaRate),
  };
}
