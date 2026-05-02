import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

/**
 * Workflow 3-Level Supervisor routes — batch operations, supervisor control actions,
 * agent tool policy CRUD.
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { setAuditData, validate } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import { upsertAgentToolBody, batchActionBody, supervisorActionBody } from '../../schemas/workflow.schemas';

import * as aiNotes from '../../services/ai/workflow-ai-notes.service';
import * as drafts from '../../services/approvals/workflow-draft-actions.service';
import * as killSwitch from '../../services/ops/workflow-kill-switch.service';
export function registerSupervisorRoutes(router: Router): void {
  // ── Agent Tool Policy CRUD ──
  router.get(
    '/workflows/agent-tool-policy', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const agentId = req.query.agentId as string;
        let where = 'WHERE is_active = TRUE';
        const params: unknown[] = [];
        if (agentId) { where += ' AND agent_id = $1'; params.push(agentId); }
        const result = await safeQuery(`SELECT * FROM "${schema}".workflow_agent_tool_policy ${where} ORDER BY agent_id, tool_name`, params);
        res.json({ items: result.rows, count: result.rows.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/agent-tool-policy',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: upsertAgentToolBody }),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const { agentId, toolName, allowed, maxCallsPerExecution, requiresApproval, contextRestrictions } = req.body;
        const result = await safeQuery(
          `INSERT INTO "${schema}".workflow_agent_tool_policy
            (agent_id, tool_name, allowed, max_calls_per_execution, requires_approval, context_restrictions)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (agent_id, tool_name) WHERE is_active = TRUE DO UPDATE SET
            allowed = COALESCE(EXCLUDED.allowed, workflow_agent_tool_policy.allowed),
            max_calls_per_execution = COALESCE(EXCLUDED.max_calls_per_execution, workflow_agent_tool_policy.max_calls_per_execution),
            requires_approval = COALESCE(EXCLUDED.requires_approval, workflow_agent_tool_policy.requires_approval),
            context_restrictions = COALESCE(EXCLUDED.context_restrictions, workflow_agent_tool_policy.context_restrictions)
           RETURNING *`,
          [agentId, toolName, allowed ?? true, maxCallsPerExecution ?? 10, requiresApproval ?? false, JSON.stringify(contextRestrictions || {})],
        );
        setAuditData(res as any, { action: 'upsert', entityType: 'workflow_agent_tool_policy', entityId: result.rows[0]?.policy_id });
        res.json(result.rows[0]);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.delete(
    '/workflows/agent-tool-policy/:policyId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('workflow.autonomous.config'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const result = await safeQuery(
          `UPDATE "${schema}".workflow_agent_tool_policy SET is_active = FALSE WHERE policy_id = $1 RETURNING *`,
          [req.params.policyId],
        );
        if (!result.rows.length) { res.status(404).json({ error: 'Policy not found' }); return; }
        res.json({ deactivated: true });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Batch Operations ──
  router.post(
    '/workflows/batch',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: batchActionBody }),
    async (req: Request, res: Response) => {
      try {
        const { action, ids, reason, decision } = req.body;
        const results: Array<{ id: string; success: boolean; error?: string }> = [];

        for (const id of ids) {
          try {
            switch (action) {
              case 'review_note':
                await aiNotes.reviewAINote(req.tenantId!, id, req.userId!, decision || 'accepted');
                break;
              case 'accept_draft':
                await drafts.acceptDraft(req.tenantId!, id, req.userId!);
                break;
              case 'reject_draft':
                await drafts.rejectDraft(req.tenantId!, id, req.userId!, reason || 'Batch rejected');
                break;
              case 'acknowledge':
                await killSwitch.acknowledgeIntervention(req.tenantId!, id, req.userId!);
                break;
              case 'approve':
              case 'reject':
              case 'escalate': {
                const { safeQuery } = await import('../../../../config/database.js');
                const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
                await safeQuery(
                  `UPDATE "${schema}".approval_requests SET status = $1, decision_comment = $2, resolved_at = NOW() WHERE request_id = $3 AND status = 'pending'`,
                  [action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'escalated', reason || '', id],
                );
                break;
              }
            }
            results.push({ id, success: true });
          } catch (err: unknown) {
            results.push({ id, success: false, error: toErrorMessage(err) });
          }
        }

        setAuditData(res as any, { action: 'batch_' + action, entityType: 'workflow_batch', entityId: `batch_${ids.length}` });
        res.json({ action, total: ids.length, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Supervisor Control Actions (pause / resume / stop / override) ──
  router.post(
    '/workflows/:instanceId/supervisor-action',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: supervisorActionBody }),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const { recordAudit } = await import('../../../audit/services/audit/core/audit-trail.service.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const { action, reason, newStatus, escalateTo } = req.body;
        const instanceId = req.params.instanceId as string;

        let statusUpdate: string;
        switch (action) {
          case 'pause': statusUpdate = 'paused'; break;
          case 'resume': statusUpdate = 'active'; break;
          case 'stop': statusUpdate = 'stopped'; break;
          case 'force_escalation': statusUpdate = 'escalated'; break;
          case 'override_status': statusUpdate = newStatus || 'active'; break;
          default: statusUpdate = 'active';
        }

        await safeQuery(
          `UPDATE "${schema}".workflow_instances SET status = $1, updated_at = NOW() WHERE instance_id = $2`,
          [statusUpdate, instanceId],
        );

        await killSwitch.logIntervention(req.tenantId!, {
          instanceId,
          interventionType: 'override_applied',
          details: { action, reason, previousStatus: 'unknown', newStatus: statusUpdate, escalateTo },
          notifiedUsers: [],
        });

        await recordAudit({ tenantId: req.tenantId!, userId: req.userId!, module: 'workflow',
          action: 'supervisor_' + action, entityType: 'workflow_instance', entityId: instanceId,
          afterState: { status: statusUpdate, reason },
        });

        res.json({ instanceId, action, status: statusUpdate, reason, timestamp: new Date().toISOString() });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );
}

