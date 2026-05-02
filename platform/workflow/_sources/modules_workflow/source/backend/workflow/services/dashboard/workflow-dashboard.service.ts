/**
 * Workflow Dashboard Service -- Analytics & Operational Dashboard Data
 *
 * Aggregates execution metrics, SLA compliance, approval bottlenecks,
 * and task distribution for real-time operational dashboards.
 *
 * MP-02 compliance: All queries use tenantSchema(tenantId) for isolation.
 * Patch 10 §3: Dashboard data derived from module-owned tables only.
 *
 * @owner product/shahin-ai
 * @module workflow
 * @since 2026-03-31
 */

import { safeQuery, emptyResult, tenantSchema } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

/** Top-level dashboard summary. */
export interface WorkflowDashboardSummary {
  tenantId: string;
  totalWorkflows: number;
  activeInstances: number;
  completedInstances: number;
  failedInstances: number;
  pendingApprovals: number;
  slaBreaches: number;
  avgCompletionHours: number;
  stuckInstances: number;
  lastCalculated: string;
}

/** Health score result. */
export interface WorkflowHealthScore {
  tenantId: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  issues: string[];
  evaluatedAt: string;
}

/** Approval bottleneck record. */
export interface WorkflowApprovalBottleneck {
  approverId: string;
  approverName: string;
  pendingCount: number;
  avgApprovalHours: number;
  oldestPendingHours: number;
}

/** SLA compliance metrics. */
export interface WorkflowSLACompliance {
  totalTracked: number;
  withinSLA: number;
  warningZone: number;
  breached: number;
  complianceRate: number;
}

/** Task distribution per assignee. */
export interface WorkflowTaskDistribution {
  assigneeId: string;
  assigneeName: string;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

/** Daily trend data point. */
export interface WorkflowTrendDataPoint {
  date: string;
  created: number;
  completed: number;
  failed: number;
}

/** Execution metrics summary. */
export interface WorkflowExecutionMetrics {
  totalExecutions: number;
  successRate: number;
  avgDurationHours: number;
  p95DurationHours: number;
  automatedSteps: number;
  manualSteps: number;
  escalations: number;
}

/** AI insights summary. */
export interface WorkflowAIInsightsSummary {
  totalAIActions: number;
  recommendationsGenerated: number;
  recommendationsAccepted: number;
  acceptanceRate: number;
  classificationsRun: number;
  reportsGenerated: number;
  lastActionAt: string | null;
}

// ── Service ────────────────────────────────────────────────────────────────

/**
 * Aggregate dashboard summary for a tenant: total workflows by status,
 * SLA breaches, pending approvals, stuck instances, and avg completion time.
 */
export async function getSummary(tenantId: string): Promise<WorkflowDashboardSummary> {
  const schema = tenantSchema(tenantId);

  // Parallel independent queries for performance
  const [instanceAgg, approvalAgg, slaAgg, stuckAgg] = await Promise.all([
    // Instance counts by status + avg completion hours
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{
        total: 0, active: 0, completed: 0, failed: 0, avg_completion_hours: 0,
      }]),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'running')::int AS active,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COALESCE(
             ROUND(AVG(
               EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
             ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL), 2),
             0
           ) AS avg_completion_hours
         FROM "${schema}".workflow_instances
         WHERE deleted_at IS NULL`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getSummary.instances' },
    ),

    // Pending approval tasks
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{ pending_approvals: 0 }]),
      safeQuery(
        `SELECT COUNT(*)::int AS pending_approvals
         FROM "${schema}".workflow_tasks
         WHERE task_type = 'approval' AND status = 'open'
           AND deleted_at IS NULL`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getSummary.approvals' },
    ),

    // SLA breaches: running executions with overdue tasks
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{ sla_breaches: 0 }]),
      safeQuery(
        `SELECT COUNT(DISTINCT we.execution_id)::int AS sla_breaches
         FROM "${schema}".workflow_instances we
         JOIN "${schema}".workflow_instance_steps wis
           ON wis.instance_id = we.execution_id AND wis.status = 'active'
         JOIN "${schema}".workflow_tasks wt
           ON wt.instance_step_id = wis.instance_step_id
         WHERE we.status = 'running'
           AND wt.due_date IS NOT NULL AND wt.due_date < NOW()
           AND wt.deleted_at IS NULL
           AND we.deleted_at IS NULL`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getSummary.sla' },
    ),

    // Stuck instances: running executions not updated in 30+ minutes
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{ stuck_count: 0 }]),
      safeQuery(
        `SELECT COUNT(*)::int AS stuck_count
         FROM "${schema}".workflow_instances
         WHERE status = 'running'
           AND updated_at < NOW() - INTERVAL '30 minutes'
           AND deleted_at IS NULL`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getSummary.stuck' },
    ),
  ]);

  const inst = instanceAgg.rows[0] ?? {};
  const appr = approvalAgg.rows[0] ?? {};
  const sla = slaAgg.rows[0] ?? {};
  const stuck = stuckAgg.rows[0] ?? {};

  return {
    tenantId,
    totalWorkflows: parseInt((inst as any).total ?? '0', 10),
    activeInstances: parseInt((inst as any).active ?? '0', 10),
    completedInstances: parseInt((inst as any).completed ?? '0', 10),
    failedInstances: parseInt((inst as any).failed ?? '0', 10),
    pendingApprovals: parseInt((appr as any).pending_approvals ?? '0', 10),
    slaBreaches: parseInt((sla as any).sla_breaches ?? '0', 10),

    avgCompletionHours: inst.avg_completion_hours != null

      ? Math.round(parseFloat(String(inst.avg_completion_hours)) * 100) / 100
      : 0,
    stuckInstances: parseInt((stuck as any).stuck_count ?? '0', 10),
    lastCalculated: new Date().toISOString(),
  };
}

/**
 * Compute a health score (0-100) based on operational health.
 *
 * Factors:
 *   - Stuck instances: -5 each (capped at -25)
 *   - SLA breaches: -8 each (capped at -40)
 *   - Failed instances (last 24h): -3 each (capped at -15)
 *   - Pending approvals > 10: -2 per extra (capped at -20)
 * Base score: 100.
 */
export async function getHealthScore(tenantId: string): Promise<WorkflowHealthScore> {
  const schema = tenantSchema(tenantId);

  const result = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{
      stuck_count: 0, sla_breaches: 0, recent_failures: 0, pending_approvals: 0,
    }]),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (
           WHERE status = 'running'
             AND updated_at < NOW() - INTERVAL '30 minutes'
         )::int AS stuck_count,
         COUNT(*) FILTER (
           WHERE status = 'failed'
             AND updated_at >= NOW() - INTERVAL '24 hours'
         )::int AS recent_failures
       FROM "${schema}".workflow_instances
       WHERE deleted_at IS NULL`,
      [],
    ),
    { tenantId, operation: 'workflow-dashboard.getHealthScore' },
  );

  const [slaResult, approvalResult] = await Promise.all([
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{ sla_breaches: 0 }]),
      safeQuery(
        `SELECT COUNT(DISTINCT we.execution_id)::int AS sla_breaches
         FROM "${schema}".workflow_instances we
         JOIN "${schema}".workflow_instance_steps wis
           ON wis.instance_id = we.execution_id AND wis.status = 'active'
         JOIN "${schema}".workflow_tasks wt
           ON wt.instance_step_id = wis.instance_step_id
         WHERE we.status = 'running'
           AND wt.due_date IS NOT NULL AND wt.due_date < NOW()
           AND wt.deleted_at IS NULL
           AND we.deleted_at IS NULL`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getHealthScore.sla' },
    ),
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{ pending_approvals: 0 }]),
      safeQuery(
        `SELECT COUNT(*)::int AS pending_approvals
         FROM "${schema}".workflow_tasks
         WHERE task_type = 'approval' AND status = 'open'
           AND deleted_at IS NULL`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getHealthScore.approvals' },
    ),
  ]);

  const row = result.rows[0] ?? {};

  const stuckCount = parseInt(row.stuck_count ?? '0', 10);

  const recentFailures = parseInt(row.recent_failures ?? '0', 10);

  const slaBreaches = parseInt(slaResult.rows[0]?.sla_breaches ?? '0', 10);

  const pendingApprovals = parseInt(approvalResult.rows[0]?.pending_approvals ?? '0', 10);

  // Health score algorithm
  const issues: string[] = [];
  let score = 100;

  const stuckPenalty = Math.min(stuckCount * 5, 25);
  if (stuckPenalty > 0) {
    score -= stuckPenalty;
    issues.push(`${stuckCount} stuck instance(s) detected`);
  }

  const slaPenalty = Math.min(slaBreaches * 8, 40);
  if (slaPenalty > 0) {
    score -= slaPenalty;
    issues.push(`${slaBreaches} SLA breach(es) active`);
  }

  const failurePenalty = Math.min(recentFailures * 3, 15);
  if (failurePenalty > 0) {
    score -= failurePenalty;
    issues.push(`${recentFailures} failure(s) in last 24 hours`);
  }

  const excessApprovals = Math.max(0, pendingApprovals - 10);
  const approvalPenalty = Math.min(excessApprovals * 2, 20);
  if (approvalPenalty > 0) {
    score -= approvalPenalty;
    issues.push(`${pendingApprovals} pending approvals (${excessApprovals} over threshold)`);
  }

  score = Math.max(0, Math.min(100, score));

  // Grade mapping
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  const summary = issues.length === 0
    ? 'Workflow engine is operating normally.'
    : `Workflow engine health degraded: ${issues.length} issue(s) detected.`;

  return {
    tenantId,
    score,
    grade,
    summary,
    issues,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Find approvers with the most pending items and longest wait times.
 * Identifies bottlenecks in the approval pipeline.
 */
export async function getApprovalBottlenecks(
  tenantId: string,
): Promise<WorkflowApprovalBottleneck[]> {
  const schema = tenantSchema(tenantId);

  const result = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         wt.assignee_id AS approver_id,
         COALESCE(u.display_name, wt.assignee_id) AS approver_name,
         COUNT(*)::int AS pending_count,
         COALESCE(
           ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - wt.created_at)) / 3600), 2),
           0
         ) AS avg_approval_hours,
         COALESCE(
           ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - wt.created_at)) / 3600), 2),
           0
         ) AS oldest_pending_hours
       FROM "${schema}".workflow_tasks wt
       LEFT JOIN "${schema}".users u ON u.user_id = wt.assignee_id
       WHERE wt.task_type = 'approval'
         AND wt.status = 'open'
         AND wt.assignee_id IS NOT NULL
         AND wt.deleted_at IS NULL
       GROUP BY wt.assignee_id, u.display_name
       ORDER BY pending_count DESC, oldest_pending_hours DESC
       LIMIT 20`,
      [],
    ),
    { tenantId, operation: 'workflow-dashboard.getApprovalBottlenecks' },
  );

  return result.rows.map((r: Record<string, unknown>) => ({
    approverId: r.approver_id,
    approverName: r.approver_name ?? r.approver_id,

    pendingCount: parseInt(r.pending_count ?? '0', 10),
    avgApprovalHours: r.avg_approval_hours != null
      ? Math.round(parseFloat(String(r.avg_approval_hours)) * 100) / 100
      : 0,
    oldestPendingHours: r.oldest_pending_hours != null
      ? Math.round(parseFloat(String(r.oldest_pending_hours)) * 100) / 100
      : 0,
  }));
}

/**
 * Calculate SLA compliance metrics across all tracked executions.
 * Groups instances into within-SLA, warning zone (75-100% elapsed),
 * and breached categories.
 */
export async function getSLACompliance(tenantId: string): Promise<WorkflowSLACompliance> {
  const schema = tenantSchema(tenantId);

  const result = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{
      total_tracked: 0, within_sla: 0, warning_zone: 0, breached: 0,
    }]),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_tracked,
         COUNT(*) FILTER (
           WHERE wt.due_date IS NOT NULL
             AND (wt.status = 'completed' AND wt.completed_at <= wt.due_date)
         )::int AS within_sla,
         COUNT(*) FILTER (
           WHERE wt.due_date IS NOT NULL
             AND wt.status = 'open'
             AND NOW() > wt.due_date - (wt.due_date - wt.created_at) * 0.25
             AND NOW() <= wt.due_date
         )::int AS warning_zone,
         COUNT(*) FILTER (
           WHERE wt.due_date IS NOT NULL
             AND (
               (wt.status = 'open' AND NOW() > wt.due_date)
               OR (wt.status = 'completed' AND wt.completed_at > wt.due_date)
             )
         )::int AS breached
       FROM "${schema}".workflow_tasks wt
       WHERE wt.due_date IS NOT NULL
         AND wt.deleted_at IS NULL`,
      [],
    ),
    { tenantId, operation: 'workflow-dashboard.getSLACompliance' },
  );

  const row = result.rows[0] ?? {};

  const totalTracked = parseInt(row.total_tracked ?? '0', 10);

  const withinSLA = parseInt(row.within_sla ?? '0', 10);

  const warningZone = parseInt(row.warning_zone ?? '0', 10);

  const breached = parseInt(row.breached ?? '0', 10);

  return {
    totalTracked,
    withinSLA,
    warningZone,
    breached,
    complianceRate: totalTracked > 0
      ? Math.round((withinSLA / totalTracked) * 10000) / 100
      : 100,
  };
}

/**
 * Task distribution per assignee: active, completed, and overdue tasks.
 * Surfaces workload imbalances across team members.
 */
export async function getTaskDistribution(
  tenantId: string,
): Promise<WorkflowTaskDistribution[]> {
  const schema = tenantSchema(tenantId);

  const result = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         wt.assignee_id,
         COALESCE(u.display_name, wt.assignee_id) AS assignee_name,
         COUNT(*) FILTER (WHERE wt.status = 'open')::int AS active_tasks,
         COUNT(*) FILTER (WHERE wt.status = 'completed')::int AS completed_tasks,
         COUNT(*) FILTER (
           WHERE wt.status = 'open'
             AND wt.due_date IS NOT NULL
             AND wt.due_date < NOW()
         )::int AS overdue_tasks
       FROM "${schema}".workflow_tasks wt
       LEFT JOIN "${schema}".users u ON u.user_id = wt.assignee_id
       WHERE wt.assignee_id IS NOT NULL
         AND wt.deleted_at IS NULL
       GROUP BY wt.assignee_id, u.display_name
       ORDER BY active_tasks DESC
       LIMIT 50`,
      [],
    ),
    { tenantId, operation: 'workflow-dashboard.getTaskDistribution' },
  );

  return result.rows.map((r: Record<string, unknown>) => ({
    assigneeId: r.assignee_id,
    assigneeName: r.assignee_name ?? r.assignee_id,

    activeTasks: parseInt(r.active_tasks ?? '0', 10),

    completedTasks: parseInt(r.completed_tasks ?? '0', 10),

    overdueTasks: parseInt(r.overdue_tasks ?? '0', 10),
  }));
}

/**
 * Produce daily trend data for the specified number of days.
 * Each data point includes created, completed, and failed counts.
 */
export async function getTrendData(
  tenantId: string,
  days: number = 30,
): Promise<WorkflowTrendDataPoint[]> {
  const schema = tenantSchema(tenantId);
  const safeDays = Math.max(1, Math.min(365, days));

  const result = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         d.date::date::text AS date,
         COUNT(we.execution_id) FILTER (
           WHERE we.created_at::date = d.date::date
         )::int AS created,
         COUNT(we.execution_id) FILTER (
           WHERE we.status = 'completed'
             AND we.completed_at::date = d.date::date
         )::int AS completed,
         COUNT(we.execution_id) FILTER (
           WHERE we.status = 'failed'
             AND we.updated_at::date = d.date::date
         )::int AS failed
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       LEFT JOIN "${schema}".workflow_instances we
         ON (we.created_at::date = d.date::date
             OR we.completed_at::date = d.date::date
             OR (we.status = 'failed' AND we.updated_at::date = d.date::date))
         AND we.deleted_at IS NULL
       GROUP BY d.date
       ORDER BY d.date ASC`,
      [safeDays],
    ),
    { tenantId, operation: 'workflow-dashboard.getTrendData' },
  );

  return result.rows.map((r: Record<string, unknown>) => ({
    date: r.date,

    created: parseInt(r.created ?? '0', 10),

    completed: parseInt(r.completed ?? '0', 10),

    failed: parseInt(r.failed ?? '0', 10),
  }));
}

/**
 * Execution metrics: success rate, duration stats, step breakdown, escalation count.
 * Provides operational KPIs for the workflow engine.
 */
export async function getExecutionMetrics(tenantId: string): Promise<WorkflowExecutionMetrics> {
  const schema = tenantSchema(tenantId);

  const [execResult, stepResult, escalationResult] = await Promise.all([
    // Execution success rate and duration stats
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{
        total_executions: 0, success_rate: 100,
        avg_duration_hours: 0, p95_duration_hours: 0,
      }]),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total_executions,
           COALESCE(
             ROUND(
               COUNT(*) FILTER (WHERE status = 'completed')::numeric /
               NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed'))::numeric, 0) * 100,
             2),
             100
           ) AS success_rate,
           COALESCE(
             ROUND(AVG(
               EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
             ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL), 2),
             0
           ) AS avg_duration_hours,
           COALESCE(
             ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
               ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
             ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL)::numeric, 2),
             0
           ) AS p95_duration_hours
         FROM "${schema}".workflow_instances
         WHERE deleted_at IS NULL
           AND created_at >= NOW() - INTERVAL '90 days'`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getExecutionMetrics.exec' },
    ),

    // Step breakdown: automated vs manual
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{ automated_steps: 0, manual_steps: 0 }]),
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE ws.step_type IN ('automated', 'system', 'script'))::int AS automated_steps,
           COUNT(*) FILTER (WHERE ws.step_type IN ('manual', 'approval', 'review', 'task'))::int AS manual_steps
         FROM "${schema}".workflow_instance_steps wis
         JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
         JOIN "${schema}".workflow_instances we ON we.execution_id = wis.instance_id
         WHERE we.deleted_at IS NULL
           AND we.created_at >= NOW() - INTERVAL '90 days'`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getExecutionMetrics.steps' },
    ),

    // Escalation count
    swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult([{ escalation_count: 0 }]),
      safeQuery(
        `SELECT COUNT(*)::int AS escalation_count
         FROM "${schema}".workflow_escalations
         WHERE created_at >= NOW() - INTERVAL '90 days'
           AND deleted_at IS NULL`,
        [],
      ),
      { tenantId, operation: 'workflow-dashboard.getExecutionMetrics.escalations' },
    ),
  ]);

  const exec = execResult.rows[0] ?? {};
  const steps = stepResult.rows[0] ?? {};
  const esc = escalationResult.rows[0] ?? {};

  return {

    totalExecutions: parseInt(exec.total_executions ?? '0', 10),

    successRate: exec.success_rate != null

      ? Math.round(parseFloat(String(exec.success_rate)) * 100) / 100
      : 100,

    avgDurationHours: exec.avg_duration_hours != null

      ? Math.round(parseFloat(String(exec.avg_duration_hours)) * 100) / 100
      : 0,

    p95DurationHours: exec.p95_duration_hours != null

      ? Math.round(parseFloat(String(exec.p95_duration_hours)) * 100) / 100
      : 0,

    automatedSteps: parseInt(steps.automated_steps ?? '0', 10),

    manualSteps: parseInt(steps.manual_steps ?? '0', 10),

    escalations: parseInt(esc.escalation_count ?? '0', 10),
  };
}

/**
 * AI insights summary: action counts, recommendation acceptance rate,
 * classifications, and report generation stats.
 * Data sourced from workflow_ai_actions audit table.
 */
export async function getAIInsightsSummary(tenantId: string): Promise<WorkflowAIInsightsSummary> {
  const schema = tenantSchema(tenantId);

  const result = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{
      total_actions: 0, recommendations_generated: 0, recommendations_accepted: 0,
      classifications_run: 0, reports_generated: 0, last_action_at: null,
    }]),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_actions,
         COUNT(*) FILTER (WHERE action_type = 'recommend')::int AS recommendations_generated,
         COUNT(*) FILTER (WHERE action_type = 'recommend' AND outcome = 'accepted')::int AS recommendations_accepted,
         COUNT(*) FILTER (WHERE action_type = 'classify')::int AS classifications_run,
         COUNT(*) FILTER (WHERE action_type = 'generate_report')::int AS reports_generated,
         MAX(created_at)::text AS last_action_at
       FROM "${schema}".workflow_ai_actions
       WHERE module_code = 'workflow'
         AND created_at >= NOW() - INTERVAL '90 days'`,
      [],
    ),
    { tenantId, operation: 'workflow-dashboard.getAIInsightsSummary' },
  );

  const row = result.rows[0] ?? {};

  const recommendationsGenerated = parseInt(row.recommendations_generated ?? '0', 10);

  const recommendationsAccepted = parseInt(row.recommendations_accepted ?? '0', 10);

  return {

    totalAIActions: parseInt(row.total_actions ?? '0', 10),
    recommendationsGenerated,
    recommendationsAccepted,
    acceptanceRate: recommendationsGenerated > 0
      ? Math.round((recommendationsAccepted / recommendationsGenerated) * 10000) / 100
      : 0,

    classificationsRun: parseInt(row.classifications_run ?? '0', 10),

    reportsGenerated: parseInt(row.reports_generated ?? '0', 10),

    lastActionAt: row.last_action_at ?? null,
  };
}

/**
 * Full dashboard payload combining all metrics into a single response.
 * Single-call convenience method for the frontend dashboard page.
 */
export async function getFullDashboard(tenantId: string): Promise<{
  summary: WorkflowDashboardSummary;
  health: WorkflowHealthScore;
  slaCompliance: WorkflowSLACompliance;
  executionMetrics: WorkflowExecutionMetrics;
  aiInsights: WorkflowAIInsightsSummary;
}> {
  const [summary, health, slaCompliance, executionMetrics, aiInsights] = await Promise.all([
    getSummary(tenantId),
    getHealthScore(tenantId),
    getSLACompliance(tenantId),
    getExecutionMetrics(tenantId),
    getAIInsightsSummary(tenantId),
  ]);

  return { summary, health, slaCompliance, executionMetrics, aiInsights };
}
