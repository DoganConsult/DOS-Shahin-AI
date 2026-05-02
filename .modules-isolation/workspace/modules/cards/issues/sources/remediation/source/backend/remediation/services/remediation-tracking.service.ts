// ============================================
// Shahin — Remediation Tracking Service
// Progress monitoring, milestone tracking,
// blocker management, dependency tracking,
// burndown metrics
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// === Types ===

export interface PlanProgress {
  planId: string;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  percentageComplete: number;
  daysRemaining: number | null;
  onTrack: boolean;
}

export interface Blocker {
  blockerId: string;
  planId: string;
  milestoneId: string | null;
  title: string;
  description: string;
  reportedBy: string;
  resolvedBy: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  resolvedAt: string | null;
}

export interface PlanDependency {
  dependencyId: string;
  planId: string;
  dependsOnPlanId: string;
  type: 'blocks' | 'required_by';
  createdAt: string;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

// === Pure Functions ===

export function computePercentageComplete(
  totalMilestones: number,
  completedMilestones: number
): number {
  if (totalMilestones === 0) return 0;
  return Math.round((completedMilestones / totalMilestones) * 100);
}

export function computeOnTrack(
  startDate: Date,
  targetDate: Date,
  now: Date,
  percentComplete: number
): boolean {
  const totalDuration = targetDate.getTime() - startDate.getTime();
  if (totalDuration <= 0) return percentComplete >= 100;
  const elapsed = now.getTime() - startDate.getTime();
  const expectedPercent = Math.min(100, (elapsed / totalDuration) * 100);
  return percentComplete >= expectedPercent - 10;
}

export function buildIdealBurndown(
  totalMilestones: number,
  startDate: Date,
  targetDate: Date
): BurndownPoint[] {
  const points: BurndownPoint[] = [];
  const totalMs = targetDate.getTime() - startDate.getTime();
  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  for (let d = 0; d <= totalDays; d++) {
    const date = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
    points.push({
      date: date.toISOString().split('T')[0],
      remaining: totalMilestones,
      ideal: Math.round(totalMilestones * (1 - d / totalDays)),
    });
  }
  return points;
}

// === Progress ===

export async function getPlanProgress(
  tenantId: string,
  planId: string
): Promise<PlanProgress> {
  const schema = tenantSchema(tenantId);
  const now = new Date();

  const [milestonesResult, planResult] = await Promise.all([
    safeQuery(
      `SELECT status, due_date FROM "${schema}".remediation_milestones WHERE plan_id = $1`,
      [planId]
    ),
    safeQuery(
      `SELECT target_date FROM "${schema}".remediation_plans WHERE plan_id = $1`,
      [planId]
    ),
  ]);

  const milestones = milestonesResult.rows;
  const total = milestones.length;
  const completed = milestones.filter((m: Record<string, unknown>) => m.status === 'completed').length;
  const overdue = milestones.filter(
    (m: Record<string, unknown>) => m.status !== 'completed' && m.due_date && new Date((m as any).due_date) < now
  ).length;

  const plan = getFirstRow(planResult)!;
  let daysRemaining: number | null = null;
  let onTrack = true;
  if (plan?.target_date) {
    const targetDate = new Date(plan.target_date);
    daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    onTrack = daysRemaining > 0 || completed === total;
  }

  return {
    planId,
    totalMilestones: total,
    completedMilestones: completed,
    overdueMilestones: overdue,
    percentageComplete: computePercentageComplete(total, completed),
    daysRemaining,
    onTrack,
  };
}

export async function updateMilestoneProgress(
  tenantId: string,
  milestoneId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".remediation_milestones
     SET status = $1, updated_at = NOW()
     WHERE milestone_id = $2`,
    [status, milestoneId]
  );
}

// === Blockers ===

function mapBlocker( r: Record<string, unknown>): Blocker {
  return {

    blockerId: r.blocker_id,

    planId: r.plan_id,

    milestoneId: r.milestone_id || null,

    title: r.title,

    description: r.description || '',

    reportedBy: r.reported_by,

    resolvedBy: r.resolved_by || null,

    status: r.status,

    severity: r.severity || 'medium',

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    resolvedAt: r.resolved_at?.toISOString?.() || r.resolved_at || null,
  };
}

export async function reportBlocker(
  tenantId: string,
  data: {
    planId: string;
    milestoneId?: string;
    title: string;
    description?: string;
    reportedBy: string;
    severity?: Blocker['severity'];
  }
): Promise<Blocker> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_blockers
       (blocker_id, plan_id, milestone_id, title, description, reported_by, status, severity)
     VALUES ($1,$2,$3,$4,$5,$6,'open',$7) RETURNING *`,
    [
      uuid(), data.planId, data.milestoneId || null,
      data.title, data.description || '', data.reportedBy,
      data.severity || 'medium',
    ]
  );
  return mapBlocker(getFirstRow(result));
}

export async function resolveBlocker(
  tenantId: string,
  blockerId: string,
  resolvedBy: string
): Promise<Blocker> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_blockers
     SET status = 'resolved', resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
     WHERE blocker_id = $1
     RETURNING *`,
    [blockerId, resolvedBy],
  );
  return mapBlocker(getFirstRow(result));
}

export async function getBlockers(
  tenantId: string,
  planId: string,
  status?: Blocker['status']
): Promise<Blocker[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [planId];
  const extra = status ? `AND status = $2` : '';
  if (status) params.push(status);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_blockers WHERE plan_id = $1 ${extra} ORDER BY severity DESC, created_at ASC`,
    params
  );
  return result.rows.map(mapBlocker);
}

// === Dependencies ===

export async function addDependency(
  tenantId: string,
  planId: string,
  dependsOnPlanId: string,
  type: PlanDependency['type'] = 'blocks'
): Promise<PlanDependency> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_plan_dependencies
       (dependency_id, plan_id, depends_on_plan_id, type)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [uuid(), planId, dependsOnPlanId, type]
  );
  const r = getFirstRow(result)!;
  return {
    dependencyId: r.dependency_id,
    planId: r.plan_id,
    dependsOnPlanId: r.depends_on_plan_id,
    type: r.type,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getDependencies(
  tenantId: string,
  planId: string
): Promise<PlanDependency[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_plan_dependencies WHERE plan_id = $1`,
    [planId]
  );
  return result.rows.map(r => ({
    dependencyId: r.dependency_id,
    planId: r.plan_id,
    dependsOnPlanId: r.depends_on_plan_id,
    type: r.type,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}

// === Burndown ===

export async function getBurndownMetrics(
  tenantId: string,
  planId: string
): Promise<{ actual: BurndownPoint[]; ideal: BurndownPoint[] }> {
  const schema = tenantSchema(tenantId);

  const planResult = await safeQuery(
    `SELECT start_date, target_date FROM "${schema}".remediation_plans WHERE plan_id = $1`,
    [planId]
  );
  const plan = getFirstRow(planResult)!;
  if (!plan?.start_date || !plan?.target_date) {
    return { actual: [], ideal: [] };
  }

  const startDate = new Date(plan.start_date);
  const targetDate = new Date(plan.target_date);

  const totalResult = await safeQuery(
    `SELECT COUNT(*) AS total FROM "${schema}".remediation_milestones WHERE plan_id = $1`,
    [planId]
  );
  const total = parseInt(getFirstRow(totalResult)?.total || '0', 10);

  const completionHistory = await safeQuery(
    `SELECT DATE(updated_at) AS day, COUNT(*) AS cnt
     FROM "${schema}".remediation_milestones
     WHERE plan_id = $1 AND status = 'completed'
     GROUP BY DATE(updated_at) ORDER BY day ASC`,
    [planId]
  );

  let remaining = total;
  const actual: BurndownPoint[] = [{ date: startDate.toISOString().split('T')[0], remaining: total, ideal: total }];
  for (const row of completionHistory.rows as Record<string, unknown>[][]) {

    remaining -= parseInt(row.cnt, 10);

    actual.push({ date: row.day, remaining, ideal: remaining });
  }

  const ideal = buildIdealBurndown(total, startDate, targetDate);
  return { actual, ideal };
}
