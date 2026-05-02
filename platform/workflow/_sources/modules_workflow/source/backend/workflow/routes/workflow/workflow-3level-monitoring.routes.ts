import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

/**
 * Workflow 3-Level Monitoring routes — system health, SLA monitoring, analytics/reporting.
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { toErrorMessage } from '@dos/module-sdk';

import * as killSwitch from '../../services/ops/workflow-kill-switch.service';
import * as budget from '../../services/ai/workflow-ai-budget.service';
import { validate } from '../../ports/middleware.port';
import { createSlaExtendBody } from '../../schemas/workflow.schemas';
export function registerMonitoringRoutes(router: Router): void {
  // ── Health (aggregated system health) ──
  router.get(
    '/workflows/health', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const [instances, sla, aiExec, ks, budgetData, pendingR, pendingD, pendingRb, intervToday] = await Promise.all([
          safeQuery(`SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE status = 'stalled') as stalled,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) FILTER (WHERE status = 'completed') as avg_ms
            FROM "${schema}".workflow_instances`),
          safeQuery(`SELECT
            ROUND(100.0 * COUNT(*) FILTER (WHERE breached_at IS NULL AND resolved_at IS NOT NULL) / GREATEST(COUNT(*), 1), 1) as pct
            FROM "${schema}".workflow_sla_records`),
          safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".ai_step_executions`),
          killSwitch.getActiveKillSwitches(req.tenantId!),
          budget.checkBudget(req.tenantId!),
          safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".workflow_ai_notes WHERE review_required = TRUE AND reviewed_at IS NULL`),
          safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".workflow_draft_actions WHERE status = 'pending'`),
          safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".workflow_rollback_log WHERE rollback_status IN ('pending', 'in_progress')`),
          safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".workflow_intervention_log WHERE created_at >= $1`, [todayStart.toISOString()]),
        ]);

        const i = instances.rows[0] || {};
        res.json({
          totalInstances: Number(i.total) || 0,
          activeInstances: Number(i.active) || 0,
          completedInstances: Number(i.completed) || 0,
          failedInstances: Number(i.failed) || 0,
          stalledInstances: Number(i.stalled) || 0,
          avgCompletionMs: Number(i.avg_ms) || 0,
          slaCompliance: Number(sla.rows[0]?.pct) || 0,
          aiExecutionCount: Number(aiExec.rows[0]?.cnt) || 0,
          killSwitchActive: ks.length > 0,
          budgetUtilization: budgetData.utilization_pct || 0,
          pendingReviews: Number(pendingR.rows[0]?.cnt) || 0,
          pendingDrafts: Number(pendingD.rows[0]?.cnt) || 0,
          pendingRollbacks: Number(pendingRb.rows[0]?.cnt) || 0,
          interventionsToday: Number(intervToday.rows[0]?.cnt) || 0,
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── SLA Monitoring ──
  router.get(
    '/workflows/sla-records', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const status = req.query.status as string;
        const limit = Math.min(Number(req.query.limit) || 50, 200);

        let where = '';
        const params: unknown[] = [];
        if (status === 'breached') { where = 'WHERE breached_at IS NOT NULL'; }
        else if (status === 'met') { where = 'WHERE breached_at IS NULL AND resolved_at IS NOT NULL'; }
        else if (status === 'active') { where = 'WHERE breached_at IS NULL AND resolved_at IS NULL'; }

        const result = await safeQuery(
          `SELECT * FROM "${schema}".workflow_sla_records ${where} ORDER BY created_at DESC LIMIT $${params.length + 1}`,
          [...params, limit],
        );
        res.json({ items: result.rows, count: result.rows.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/:instanceId/sla-extend',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createSlaExtendBody }),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const { recordAudit } = await import('../../../audit/services/audit/core/audit-trail.service.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const { extensionHours, reason } = req.body;
        if (!extensionHours || !reason) { res.status(400).json({ error: 'extensionHours and reason required' }); return; }

        const result = await safeQuery(
          `UPDATE "${schema}".workflow_sla_records SET
            due_at = due_at + INTERVAL '1 hour' * $1,
            updated_at = NOW()
           WHERE instance_id = $2 AND breached_at IS NULL AND resolved_at IS NULL
           RETURNING *`,
          [extensionHours, req.params.instanceId],
        );

        await recordAudit({ tenantId: req.tenantId!, userId: req.userId!, module: 'workflow',
          action: 'sla_extend', entityType: 'workflow_sla_record', entityId: req.params.instanceId as string,
          afterState: { extensionHours, reason },
        });

        res.json({ extended: result.rows.length, records: result.rows });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Analytics / Reporting ──
  router.get(
    '/workflows/analytics', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const days = Number(req.query.days) || 30;
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { safeQuery } = await import('../../../../config/database.js');

        const [instanceStats, stepStats, aiStats, slaStats, approvalStats, noteStats, draftStats] = await Promise.all([
          safeQuery(`SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE status = 'stalled') as stalled,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) FILTER (WHERE status = 'completed') as avg_completion_ms,
            COUNT(*) FILTER (WHERE created_at >= $1) as recent
            FROM "${schema}".workflow_instances`, [cutoff]),
          safeQuery(`SELECT step_type, COUNT(*) as count, AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_sec
            FROM "${schema}".workflow_step_executions WHERE created_at >= $1
            GROUP BY step_type ORDER BY count DESC LIMIT 20`, [cutoff]),
          safeQuery(`SELECT
            COUNT(*) as total_executions,
            COUNT(*) FILTER (WHERE status = 'approved') as auto_approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as auto_rejected,
            COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review,
            AVG(confidence) as avg_confidence
            FROM "${schema}".ai_step_executions WHERE created_at >= $1`, [cutoff]),
          safeQuery(`SELECT
            COUNT(*) as total_sla,
            COUNT(*) FILTER (WHERE breached_at IS NOT NULL) as breached,
            COUNT(*) FILTER (WHERE breached_at IS NULL AND resolved_at IS NOT NULL) as met,
            ROUND(100.0 * COUNT(*) FILTER (WHERE breached_at IS NULL AND resolved_at IS NOT NULL) / GREATEST(COUNT(*), 1), 1) as compliance_pct
            FROM "${schema}".workflow_sla_records WHERE created_at >= $1`, [cutoff]),
          safeQuery(`SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours
            FROM "${schema}".approval_requests WHERE created_at >= $1`, [cutoff]),
          safeQuery(`SELECT
            note_type, COUNT(*) as count,
            COUNT(*) FILTER (WHERE review_decision = 'accepted') as accepted,
            COUNT(*) FILTER (WHERE review_decision = 'rejected') as rejected
            FROM "${schema}".workflow_ai_notes WHERE created_at >= $1
            GROUP BY note_type ORDER BY count DESC`, [cutoff]),
          safeQuery(`SELECT
            draft_type, COUNT(*) as count,
            COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
            COUNT(*) FILTER (WHERE status = 'converted') as converted
            FROM "${schema}".workflow_draft_actions WHERE created_at >= $1
            GROUP BY draft_type ORDER BY count DESC`, [cutoff]),
        ]);

        const i = instanceStats.rows[0] || {};
        res.json({
          period: { days, since: cutoff },
          instances: {
            total: Number(i.total) || 0, active: Number(i.active) || 0,
            completed: Number(i.completed) || 0, failed: Number(i.failed) || 0,
            stalled: Number(i.stalled) || 0, recent: Number(i.recent) || 0,
            avgCompletionMs: Number(i.avg_completion_ms) || 0,
          },
          stepBreakdown: stepStats.rows.map(( r: Record<string, unknown>) => ({ stepType: r.step_type, count: Number(r.count), avgDurationSec: Number(r.avg_duration_sec) || 0 })),
          aiExecution: {
            totalExecutions: Number(aiStats.rows[0]?.total_executions) || 0,
            autoApproved: Number(aiStats.rows[0]?.auto_approved) || 0,
            autoRejected: Number(aiStats.rows[0]?.auto_rejected) || 0,
            pendingReview: Number(aiStats.rows[0]?.pending_review) || 0,
            avgConfidence: Number(aiStats.rows[0]?.avg_confidence) || 0,
          },
          sla: {
            total: Number(slaStats.rows[0]?.total_sla) || 0,
            breached: Number(slaStats.rows[0]?.breached) || 0,
            met: Number(slaStats.rows[0]?.met) || 0,
            compliancePct: Number(slaStats.rows[0]?.compliance_pct) || 0,
          },
          approvals: {
            total: Number(approvalStats.rows[0]?.total) || 0,
            pending: Number(approvalStats.rows[0]?.pending) || 0,
            approved: Number(approvalStats.rows[0]?.approved) || 0,
            rejected: Number(approvalStats.rows[0]?.rejected) || 0,
            avgResolutionHours: Number(approvalStats.rows[0]?.avg_resolution_hours) || 0,
          },
          aiNotes: noteStats.rows.map(( r: Record<string, unknown>) => ({ noteType: r.note_type, count: Number(r.count), accepted: Number(r.accepted), rejected: Number(r.rejected) })),
          draftActions: draftStats.rows.map(( r: Record<string, unknown>) => ({ draftType: r.draft_type, count: Number(r.count), accepted: Number(r.accepted), rejected: Number(r.rejected), converted: Number(r.converted) })),
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );
}

