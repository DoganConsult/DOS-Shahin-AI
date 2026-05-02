import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

/**
 * Workflow 3-Level AI routes — AI notes, AI policy, AI budget, step autonomy, confidence analytics, next-best-action.
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { setAuditData, validate, blockInHumanOnlyMode } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import { createNoteBody, upsertPolicyBody, upsertBudgetBody, upsertStepAutonomyBody, createReviewBody, createCheckBody } from '../../schemas/workflow.schemas';

import * as aiNotes from '../../services/ai/workflow-ai-notes.service';
import * as aiPolicy from '../../services/ai/workflow-ai-policy.service';
import * as budget from '../../services/ai/workflow-ai-budget.service';
import * as stepAutonomy from '../../services/ai/workflow-step-autonomy.service';
import * as drafts from '../../services/approvals/workflow-draft-actions.service';
export function registerAiRoutes(router: Router): void {
  // ── L2: AI Notes ──
  router.post(
    '/workflows/ai-notes',
    authenticate, requirePermission('workflow.autonomous.write'), blockInHumanOnlyMode(),
    validate({ body: createNoteBody }),
    async (req: Request, res: Response) => {
      try {
        const note = await aiNotes.createAINote(req.tenantId!, req.body);
        setAuditData(res as any, { action: 'create', entityType: 'workflow_ai_note', entityId: note.note_id });
        res.status(201).json(note);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/:instanceId/ai-notes', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const result = await aiNotes.getNotesByInstance(req.tenantId!, req.params.instanceId as string, {
          stepId: req.query.stepId as string,
          noteType: req.query.noteType as any,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          offset: req.query.offset ? Number(req.query.offset) : undefined,
        });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/ai-notes/:noteId/review',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createReviewBody }),
    async (req: Request, res: Response) => {
      try {
        const { decision } = req.body;
        if (!['accepted', 'rejected', 'modified'].includes(decision)) {
          res.status(400).json({ error: 'Invalid decision' }); return;
        }
        const result = await aiNotes.reviewAINote(req.tenantId!, req.params.noteId as string, req.userId!, decision);
        if (!result) { res.status(404).json({ error: 'Note not found' }); return; }
        setAuditData(res as any, { action: 'update', entityType: 'workflow_ai_note', entityId: req.params.noteId as string });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/ai-notes/pending', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await aiNotes.getPendingReviewNotes(req.tenantId!);
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L2: Per-Workflow AI Policy ──
  router.get(
    '/workflows/:workflowId/ai-policy', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const policy = await aiPolicy.getWorkflowAIPolicy(req.tenantId!, req.params.workflowId as string);
        res.json(policy || { workflow_id: req.params.workflowId, exists: false });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/:workflowId/ai-policy/effective', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const effective = await aiPolicy.resolveEffectiveAIPolicy(req.tenantId!, req.params.workflowId as string);
        res.json(effective);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.put(
    '/workflows/:workflowId/ai-policy',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: upsertPolicyBody }),
    async (req: Request, res: Response) => {
      try {
        const policy = await aiPolicy.upsertWorkflowAIPolicy(req.tenantId!, req.userId!, req.params.workflowId as string, req.body);
        setAuditData(res as any, { action: 'update', entityType: 'workflow_ai_policy', entityId: req.params.workflowId as string });
        res.json(policy);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.delete(
    '/workflows/:workflowId/ai-policy', validate({ body: genericPayloadSchema }), authenticate, requirePermission('workflow.autonomous.config'),
    async (req: Request, res: Response) => {
      try {
        const result = await aiPolicy.deleteWorkflowAIPolicy(req.tenantId!, req.userId!, req.params.workflowId as string);
        if (!result) { res.status(404).json({ error: 'Policy not found' }); return; }
        res.json({ deleted: true });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L3: AI Budget / Quota ──
  router.get(
    '/workflows/ai-budget', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const periodType = (req.query.periodType as any) || 'daily';
        const result = await budget.getBudget(req.tenantId!, periodType);
        res.json(result || { exists: false });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/ai-budget/check',
    authenticate, requirePermission('workflow.instance.read'),
    validate({ body: createCheckBody }),
    async (req: Request, res: Response) => {
      try {
        const result = await budget.checkBudget(req.tenantId!, req.body.costUnits);
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.put(
    '/workflows/ai-budget',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: upsertBudgetBody }),
    async (req: Request, res: Response) => {
      try {
        const result = await budget.upsertBudget(req.tenantId!, req.body);
        setAuditData(res as any, { action: 'update', entityType: 'workflow_ai_budget', entityId: result.budget_id });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L3: Per-Step Autonomy Scope ──
  router.get(
    '/workflows/step-autonomy', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await stepAutonomy.getStepAutonomyScopes(req.tenantId!, {
          workflowId: req.query.workflowId as string,
          stepType: req.query.stepType as string,
        });
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/step-autonomy/check',
    authenticate, requirePermission('workflow.instance.read'),
    validate({ body: createCheckBody }),
    async (req: Request, res: Response) => {
      try {
        const { stepType, stepSubType, workflowId } = req.body;
        if (!stepType) { res.status(400).json({ error: 'stepType required' }); return; }
        const result = await stepAutonomy.checkStepAutonomy(req.tenantId!, stepType, stepSubType, workflowId);
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/step-autonomy',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: upsertStepAutonomyBody }),
    async (req: Request, res: Response) => {
      try {
        const scope = await stepAutonomy.upsertStepAutonomy(req.tenantId!, req.userId!, req.body);
        setAuditData(res as any, { action: 'create', entityType: 'workflow_step_autonomy', entityId: scope.scope_id });
        res.status(201).json(scope);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.delete(
    '/workflows/step-autonomy/:scopeId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('workflow.autonomous.config'),
    async (req: Request, res: Response) => {
      try {
        const result = await stepAutonomy.deactivateStepAutonomy(req.tenantId!, req.params.scopeId as string, req.userId!);
        if (!result) { res.status(404).json({ error: 'Scope not found' }); return; }
        res.json({ deactivated: true });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── AI Confidence Analytics ──
  router.get(
    '/workflows/ai-confidence', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const days = Number(req.query.days) || 30;
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();

        const [distribution, byAgent, byStep, trend] = await Promise.all([
          safeQuery(`SELECT
            COUNT(*) FILTER (WHERE confidence >= 0.9) as high,
            COUNT(*) FILTER (WHERE confidence >= 0.7 AND confidence < 0.9) as medium,
            COUNT(*) FILTER (WHERE confidence >= 0.5 AND confidence < 0.7) as low,
            COUNT(*) FILTER (WHERE confidence < 0.5) as very_low,
            AVG(confidence) as overall_avg, MIN(confidence) as min_conf, MAX(confidence) as max_conf
            FROM "${schema}".ai_step_executions WHERE created_at >= $1`, [cutoff]),
          safeQuery(`SELECT agent_id, COUNT(*) as executions, AVG(confidence) as avg_confidence,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected
            FROM "${schema}".ai_step_executions WHERE created_at >= $1
            GROUP BY agent_id ORDER BY executions DESC`, [cutoff]),
          safeQuery(`SELECT step_type, COUNT(*) as executions, AVG(confidence) as avg_confidence
            FROM "${schema}".ai_step_executions a
            JOIN "${schema}".workflow_step_executions s ON s.step_id = a.step_id
            WHERE a.created_at >= $1
            GROUP BY step_type ORDER BY avg_confidence ASC LIMIT 20`, [cutoff]),
          safeQuery(`SELECT DATE(created_at) as day, AVG(confidence) as avg_conf, COUNT(*) as cnt
            FROM "${schema}".ai_step_executions WHERE created_at >= $1
            GROUP BY DATE(created_at) ORDER BY day ASC`, [cutoff]),
        ]);

        const d = distribution.rows[0] || {};
        res.json({
          period: { days, since: cutoff },
          distribution: { high: Number(d.high) || 0, medium: Number(d.medium) || 0, low: Number(d.low) || 0, veryLow: Number(d.very_low) || 0 },
          overall: { avg: Number(d.overall_avg) || 0, min: Number(d.min_conf) || 0, max: Number(d.max_conf) || 0 },
          byAgent: byAgent.rows.map(( r: Record<string, unknown>) => ({ agentId: r.agent_id, executions: Number(r.executions), avgConfidence: Number(r.avg_confidence), approved: Number(r.approved), rejected: Number(r.rejected) })),
          byStepType: byStep.rows.map(( r: Record<string, unknown>) => ({ stepType: r.step_type, executions: Number(r.executions), avgConfidence: Number(r.avg_confidence) })),
          trend: trend.rows.map(( r: Record<string, unknown>) => ({ day: r.day, avgConfidence: Number(r.avg_conf), count: Number(r.cnt) })),
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Next Best Action (AI-powered recommendation for current step) ──
  router.get(
    '/workflows/:instanceId/next-best-action', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const { safeQuery } = await import('../../../../config/database.js');
        const schema = `tenant_${req.tenantId!.replace(/-/g, '_')}`;
        const instanceId = req.params.instanceId as string;

        const instanceRes = await safeQuery(
          `SELECT * FROM "${schema}".workflow_instances WHERE instance_id = $1`, [instanceId],
        );
        if (!instanceRes.rows.length) { res.status(404).json({ error: 'Instance not found' }); return; }
        const instance = instanceRes.rows[0];

        const currentStepRes = await safeQuery(
          `SELECT * FROM "${schema}".workflow_step_executions
           WHERE workflow_instance_id = $1 AND status IN ('pending', 'in_progress')
           ORDER BY created_at DESC LIMIT 1`, [instanceId],
        );

        const pendingApprovals = await safeQuery(
          `SELECT COUNT(*) as cnt FROM "${schema}".approval_requests
           WHERE entity_id = $1 AND status = 'pending'`, [instanceId],
        );

        const recentNotes = await aiNotes.getNotesByInstance(req.tenantId!, instanceId, { limit: 5 });
        const pendingDraftRes = await drafts.getDraftsByInstance(req.tenantId!, instanceId, { status: 'pending', limit: 5 });

        const currentStep = currentStepRes.rows[0] || null;
        const recommendations: Array<{ priority: number; action: string; label: string; description: string; confidence: number; category: string }> = [];
        let priority = 1;

        if (Number(pendingApprovals.rows[0]?.cnt) > 0) {
          recommendations.push({ priority: priority++, action: 'review_approval', label: 'Review Pending Approval', description: `${pendingApprovals.rows[0].cnt} approval(s) awaiting decision`, confidence: 0.95, category: 'approval' });
        }

        if (pendingDraftRes.items.length > 0) {
          recommendations.push({ priority: priority++, action: 'review_drafts', label: 'Review AI Draft Actions', description: `${pendingDraftRes.items.length} draft(s) ready for review`, confidence: 0.9, category: 'ai_review' });
        }

        if (recentNotes.items.some((n) => n.review_required && !n.reviewed_at)) {
          const unreviewedCount = recentNotes.items.filter((n) => n.review_required && !n.reviewed_at).length;
          recommendations.push({ priority: priority++, action: 'review_ai_notes', label: 'Review AI Notes', description: `${unreviewedCount} AI note(s) requiring human review`, confidence: 0.85, category: 'ai_review' });
        }

        if (currentStep) {
          if (currentStep.status === 'pending') {
            recommendations.push({ priority: priority++, action: 'start_step', label: `Start Step: ${currentStep.step_type}`, description: 'Current step is pending. Begin execution to progress workflow.', confidence: 0.8, category: 'execution' });
          }
          if (instance.sla_deadline && new Date(instance.sla_deadline) < new Date(Date.now() + 3600000)) {
            recommendations.push({ priority: priority++, action: 'escalate_sla', label: 'Escalate SLA Risk', description: 'SLA deadline approaching within 1 hour', confidence: 0.95, category: 'sla' });
          }
        }

        if (!currentStep && instance.status === 'active') {
          recommendations.push({ priority: priority++, action: 'advance_workflow', label: 'Advance Workflow', description: 'No active step found. Advance to next phase.', confidence: 0.75, category: 'execution' });
        }

        if (instance.status === 'stalled') {
          recommendations.push({ priority: priority++, action: 'investigate_stall', label: 'Investigate Stalled Workflow', description: 'Workflow is stalled. Review execution trace for issues.', confidence: 0.9, category: 'remediation' });
        }

        res.json({
          instanceId,
          workflowStatus: instance.status,
          currentStep: currentStep ? { stepId: currentStep.step_id, stepType: currentStep.step_type, status: currentStep.status } : null,
          recommendations: recommendations.sort((a, b) => a.priority - b.priority),
          generatedAt: new Date().toISOString(),
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );
}

