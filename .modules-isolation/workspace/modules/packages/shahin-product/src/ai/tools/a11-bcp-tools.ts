// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A11 — Business Continuity Planning
// Tools: scan BCP readiness, check exercises, detect RTO/RPO drift, flag risks
// ================================================================

import { tenantSchema } from '@dos/db';
import { AgentToolDefinition } from '@dos/module-sdk';
import { recordAudit } from '@dos/platform-core/observability';
import { safeRows } from '@dos/module-sdk';

export function buildA11Tools(): AgentToolDefinition[] {
  return [
    {
      name: 'scan_bcp_readiness',
      description: 'Scan BCP readiness: plan coverage, exercise freshness, single points of failure.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const [plans, exercises, deps] = await Promise.all([
          safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'approved')::int AS approved FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`),
          safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE next_exercise_date < NOW())::int AS overdue FROM "${schema}".bcp_exercises WHERE deleted_at IS NULL`),
          safeRows(`SELECT COUNT(*)::int AS spof FROM "${schema}".bcp_dependencies WHERE redundancy_level = 'none' AND deleted_at IS NULL`),
        ]);
        const p = plans[0] || { total: 0, approved: 0 };
        const e = exercises[0] || { total: 0, overdue: 0 };
        const coverage = p.total > 0 ? Math.round(p.approved / p.total * 100) : 0;
        return { planCoverage: coverage, totalPlans: p.total, approvedPlans: p.approved, overdueExercises: e.overdue, singlePointsOfFailure: deps[0]?.spof || 0, readinessLevel: coverage >= 80 && e.overdue === 0 ? 'ready' : 'at_risk' };
      },
    },
    {
      name: 'check_exercise_schedule',
      description: 'List BCP exercises with their schedule status.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const exercises = await safeRows(
          `SELECT exercise_id, title, exercise_type, status, next_exercise_date, last_exercise_date
           FROM "${schema}".bcp_exercises WHERE deleted_at IS NULL ORDER BY next_exercise_date ASC LIMIT 30`
        );
        return { exercises, count: exercises.length };
      },
    },
    {
      name: 'check_rto_rpo_drift',
      description: 'Detect RTO/RPO drift between BCP plan targets and last exercise results.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const drifts = await safeRows(
          `SELECT p.plan_id, p.title, p.rto_hours AS target_rto, p.rpo_hours AS target_rpo,
                  e.actual_rto_hours, e.actual_rpo_hours
           FROM "${schema}".bcp_plans p
           LEFT JOIN "${schema}".bcp_exercises e ON e.plan_id = p.plan_id AND e.status = 'completed'
           WHERE p.deleted_at IS NULL AND (e.actual_rto_hours > p.rto_hours OR e.actual_rpo_hours > p.rpo_hours)
           ORDER BY p.plan_id LIMIT 20`
        );
        return { drifts, count: drifts.length };
      },
    },
    {
      name: 'flag_bcp_risk',
      description: 'Flag a BCP continuity risk for the risk register.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
        required: ['title', 'description', 'severity'],
      },
      handler: async (tenantId, input) => {
        const schema = tenantSchema(tenantId);
        const rows = await safeRows(
          `INSERT INTO "${schema}".risks (title, description, risk_category, likelihood, impact, status, created_at)
           VALUES ($1, $2, 'business_continuity', 3, CASE $3 WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 ELSE 2 END, 'open', NOW()) RETURNING risk_id`,
          [`[A11] ${input.title}`, input.description, input.severity]
        );
        if (rows.length === 0) return { flagged: false, reason: 'Insert failed' };
        await recordAudit({ tenantId, userId: 'agent-A11', module: 'bcp', action: 'create', entityType: 'risk', entityId: String(rows[0].risk_id), afterState: { title: input.title, severity: input.severity, category: 'business_continuity' } });
        return { flagged: true, riskId: rows[0].risk_id };
      },
    },
    {
      name: 'create_bcp_task',
      description: 'Create a BCP-related task for follow-up.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
        required: ['title', 'description'],
      },
      handler: async (tenantId, input) => {
        const schema = tenantSchema(tenantId);
        const rows = await safeRows(
          `INSERT INTO "${schema}".tasks (title, description, category, priority, status, created_at)
           VALUES ($1, $2, 'bcp', $3, 'open', NOW()) RETURNING task_id`,
          [`[A11] ${input.title}`, input.description, input.priority || 'medium']
        );
        if (rows.length === 0) return { created: false, reason: 'Insert failed' };
        await recordAudit({ tenantId, userId: 'agent-A11', module: 'bcp', action: 'create', entityType: 'task', entityId: String(rows[0].task_id), afterState: { title: input.title, priority: input.priority || 'medium', category: 'bcp' } });
        return { created: true, taskId: rows[0].task_id };
      },
    },
  ];
}
