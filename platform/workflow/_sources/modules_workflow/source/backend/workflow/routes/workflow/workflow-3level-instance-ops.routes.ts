import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

/**
 * Workflow 3-Level Instance Operations routes — instance listing, clone, reassignment,
 * approval chain, notification dispatch, data export, execution trace.
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { setAuditData as _setAuditData , validate } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import { createReassignBody, createCloneBody, createNotifyBody } from '../../schemas/workflow.schemas';
export function registerInstanceOpsRoutes(router: Router): void {
  // ── Workflow Instances Listing (search/filter/paginate) ──
  router.get(
    '/workflows/instances', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const limit = Math.min(Number(req.query.limit) || 25, 100);
        const offset = Number(req.query.offset) || 0;
        const status = req.query.status as string;
        const definitionId = req.query.definitionId as string;
        const search = req.query.search as string;
        const sortBy = req.query.sortBy === 'created_at' || req.query.sortBy === 'updated_at' ? req.query.sortBy : 'updated_at';
        const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';

        const conditions: string[] = [];
        const params: unknown[] = [];
        let paramIdx = 1;

        if (status) { conditions.push(`wi.status = $${paramIdx++}`); params.push(status); }
        if (definitionId) { conditions.push(`wi.definition_id = $${paramIdx++}`); params.push(definitionId); }
        if (search) { conditions.push(`(wi.instance_id::text ILIKE $${paramIdx} OR wi.context::text ILIKE $${paramIdx})`); params.push(`%${search}%`); paramIdx++; }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [countRes, dataRes] = await Promise.all([
          safeQuery(`SELECT COUNT(*) as total FROM "${schema}".workflow_instances wi ${where}`, params),
          safeQuery(`SELECT wi.*, wd.name_en as definition_name
            FROM "${schema}".workflow_instances wi
            LEFT JOIN "${schema}".workflow_definitions wd ON wd.definition_id = wi.definition_id
            ${where} ORDER BY wi.${sortBy} ${sortDir} LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
            [...params, limit, offset]),
        ]);

        res.json({
          items: dataRes.rows,
          total: Number(countRes.rows[0]?.total) || 0,
          limit, offset,
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Task Delegation / Reassignment ──
  router.post(
    '/workflows/:instanceId/reassign',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createReassignBody }),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const { recordAudit } = await import('../../../audit/services/audit/core/audit-trail.service.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const { stepId, newAssigneeId, reason } = req.body;
        if (!newAssigneeId || !reason) { res.status(400).json({ error: 'newAssigneeId and reason required' }); return; }

        let where = `workflow_instance_id = $1 AND status IN ('pending', 'in_progress')`;
        const params: unknown[] = [req.params.instanceId];
        if (stepId) { where += ` AND step_id = $2`; params.push(stepId); }

        const prev = await safeQuery(`SELECT step_id, assignee_id FROM "${schema}".workflow_step_executions WHERE ${where}`, params);

        const result = await safeQuery(
          `UPDATE "${schema}".workflow_step_executions SET assignee_id = $${params.length + 1}, updated_at = NOW() WHERE ${where} RETURNING *`,
          [...params, newAssigneeId],
        );

        for (const row of result.rows) {
          const prevRow = prev.rows.find((p: Record<string, unknown>) => p.step_id === row.step_id);
          await recordAudit({ tenantId: req.tenantId!, userId: req.userId!, module: 'workflow',
            action: 'task_reassign', entityType: 'workflow_step_execution', entityId: row.step_id,
            beforeState: { assignee: prevRow?.assignee_id },
            afterState: { assignee: newAssigneeId, reason },
          });
        }

        res.json({ reassigned: result.rows.length, steps: result.rows });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Workflow Instance Clone ──
  router.post(
    '/workflows/:instanceId/clone',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createCloneBody }),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const { recordAudit } = await import('../../../audit/services/audit/core/audit-trail.service.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const sourceRes = await safeQuery(`SELECT * FROM "${schema}".workflow_instances WHERE instance_id = $1`, [req.params.instanceId]);
        if (!sourceRes.rows.length) { res.status(404).json({ error: 'Instance not found' }); return; }
        const src = sourceRes.rows[0];

        const cloneRes = await safeQuery(
          `INSERT INTO "${schema}".workflow_instances (definition_id, status, context, started_by, current_step_id, version)
           VALUES ($1, 'draft', $2, $3, NULL, 1) RETURNING *`,
          [src.definition_id, JSON.stringify({ ...(src.context || {}), cloned_from: req.params.instanceId }), req.userId!],
        );

        await recordAudit({ tenantId: req.tenantId!, userId: req.userId!, module: 'workflow',
          action: 'clone', entityType: 'workflow_instance', entityId: cloneRes.rows[0].instance_id,
          afterState: { clonedFrom: req.params.instanceId },
        });

        res.status(201).json(cloneRes.rows[0]);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Approval Chain Status ──
  router.get(
    '/workflows/:instanceId/approval-chain', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const result = await safeQuery(
          `SELECT ar.*, u.display_name as approver_name
           FROM "${schema}".approval_requests ar
           LEFT JOIN "${schema}".users u ON u.user_id = ar.approver_id
           WHERE ar.entity_id = $1
           ORDER BY ar.created_at ASC`,
          [req.params.instanceId],
        );

        const chain = result.rows;
        const pending = chain.filter(( r: Record<string, unknown>) => r.status === 'pending').length;
        const approved = chain.filter(( r: Record<string, unknown>) => r.status === 'approved').length;
        const rejected = chain.filter(( r: Record<string, unknown>) => r.status === 'rejected').length;

        res.json({
          instanceId: req.params.instanceId,
          totalSteps: chain.length,
          pending, approved, rejected,
          isComplete: pending === 0 && chain.length > 0,
          chain,
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Notification Dispatch ──
  router.post(
    '/workflows/:instanceId/notify',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createNotifyBody }),
    async (req: Request, res: Response) => {
      try {
        const { recordAudit } = await import('../../../audit/services/audit/core/audit-trail.service.js');
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const { type, recipientIds, subject, message, channel } = req.body;
        if (!type || !recipientIds?.length || !subject) {
          res.status(400).json({ error: 'type, recipientIds, and subject required' }); return;
        }

        const notifRows = [];
        for (const recipientId of recipientIds) {
          const nr = await safeQuery(
            `INSERT INTO "${schema}".notifications (user_id, title, body, type, entity_type, entity_id, module, channel)
             VALUES ($1, $2, $3, $4, 'workflow_instance', $5, 'workflow', $6) RETURNING notification_id`,
            [recipientId, subject, message || '', type, req.params.instanceId, channel || 'in_app'],
          );
          notifRows.push({ recipientId, notificationId: nr.rows[0]?.notification_id });
        }

        await recordAudit({ tenantId: req.tenantId!, userId: req.userId!, module: 'workflow',
          action: 'notify', entityType: 'workflow_instance', entityId: req.params.instanceId as string,
          afterState: { type, recipientCount: recipientIds.length, channel },
        });

        res.json({ dispatched: notifRows.length, notifications: notifRows });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Workflow Data Export ──
  router.get(
    '/workflows/:instanceId/export', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const instanceId = req.params.instanceId;

        const [instance, steps, approvals, comments, notes, draftActions, interventions, rollbacks, slaRecords] = await Promise.all([
          safeQuery(`SELECT * FROM "${schema}".workflow_instances WHERE instance_id = $1`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_step_executions WHERE workflow_instance_id = $1 ORDER BY started_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".approval_requests WHERE entity_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_comments WHERE instance_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_ai_notes WHERE instance_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_draft_actions WHERE instance_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_intervention_log WHERE instance_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_rollback_log WHERE instance_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_sla_records WHERE instance_id = $1`, [instanceId]),
        ]);

        if (!instance.rows.length) { res.status(404).json({ error: 'Instance not found' }); return; }

        res.json({
          exportedAt: new Date().toISOString(),
          instanceId,
          instance: instance.rows[0],
          steps: steps.rows,
          approvals: approvals.rows,
          comments: comments.rows,
          aiNotes: notes.rows,
          draftActions: draftActions.rows,
          interventions: interventions.rows,
          rollbacks: rollbacks.rows,
          slaRecords: slaRecords.rows,
          summary: {
            totalSteps: steps.rows.length,
            totalApprovals: approvals.rows.length,
            totalComments: comments.rows.length,
            totalAINotes: notes.rows.length,
            totalDrafts: draftActions.rows.length,
            totalInterventions: interventions.rows.length,
            totalRollbacks: rollbacks.rows.length,
          },
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Execution Trace (L3 runtime tracing) ──
  router.get(
    '/workflows/:instanceId/execution-trace', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const instanceId = req.params.instanceId;

        const [steps, aiExecs, audits, interventions, rollbacks] = await Promise.all([
          safeQuery(`SELECT * FROM "${schema}".workflow_step_executions
            WHERE workflow_instance_id = $1 ORDER BY started_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".ai_step_executions
            WHERE workflow_execution_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".audit_logs
            WHERE entity_id = $1 AND module = 'workflow'
            ORDER BY created_at ASC LIMIT 100`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_intervention_log
            WHERE instance_id = $1 ORDER BY created_at ASC`, [instanceId]),
          safeQuery(`SELECT * FROM "${schema}".workflow_rollback_log
            WHERE instance_id = $1 ORDER BY created_at ASC`, [instanceId]),
        ]);

        const traceEvents: Array<{
          timestamp: string; eventType: string; source: string;
          stepId?: string; details: Record<string, unknown>;
        }> = [];

        for (const s of steps.rows) {
          traceEvents.push({
            timestamp: s.started_at || s.created_at, eventType: 'step_execution',
            source: 'engine', stepId: s.step_id,
            details: { stepType: s.step_type, status: s.status, assignee: s.assignee_id, duration: s.completed_at ? new Date(s.completed_at).getTime() - new Date(s.started_at).getTime() : null },
          });
        }
        for (const a of aiExecs.rows) {
          traceEvents.push({
            timestamp: a.created_at, eventType: 'ai_execution',
            source: 'agent', stepId: a.step_id,
            details: { agentId: a.agent_id, status: a.status, confidence: a.confidence, triggerReason: a.trigger_reason, aiOutput: a.ai_output },
          });
        }
        for (const au of audits.rows) {
          traceEvents.push({
            timestamp: au.created_at, eventType: 'audit_event',
            source: 'audit',
            details: { action: au.action, userId: au.user_id, entityType: au.entity_type, summary: au.summary },
          });
        }
        for (const iv of interventions.rows) {
          traceEvents.push({
            timestamp: iv.created_at, eventType: 'intervention',
            source: 'supervisor', stepId: iv.step_id,
            details: { type: iv.intervention_type, agentId: iv.agent_id, acknowledged: !!iv.acknowledged_by },
          });
        }
        for (const rb of rollbacks.rows) {
          traceEvents.push({
            timestamp: rb.created_at, eventType: 'rollback',
            source: 'safety', stepId: rb.step_id,
            details: { originalAction: rb.original_action_type, compensating: rb.compensating_action_type, status: rb.rollback_status, reason: rb.rollback_reason },
          });
        }

        traceEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        res.json({ instanceId, traceCount: traceEvents.length, events: traceEvents });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );
}

