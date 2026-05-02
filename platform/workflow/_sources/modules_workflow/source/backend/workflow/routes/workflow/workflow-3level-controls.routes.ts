import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

/**
 * Workflow 3-Level Controls routes — forbidden boundaries, mandatory review, kill switch,
 * intervention log, rollback/compensation, guardrail status.
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { setAuditData, validate, requireHybridOrHigher } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import { activateKillSwitchBody, initiateRollbackBody, createCheckBody, createForbiddenBoundariesBody, updateMandatoryReviewPointsBody, createDeactivateBody, createAcknowledgeBody, createExecuteBody } from '../../schemas/workflow.schemas';

import * as boundaries from '../../services/ops/workflow-forbidden-boundaries.service';
import * as review from '../../services/approvals/workflow-mandatory-review.service';
import * as killSwitch from '../../services/ops/workflow-kill-switch.service';
import * as rollback from '../../services/ops/workflow-rollback.service';
import * as budget from '../../services/ai/workflow-ai-budget.service';
import * as stepAutonomy from '../../services/ai/workflow-step-autonomy.service';
export function registerControlsRoutes(router: Router): void {
  // ── L2: Forbidden Boundaries ──
  router.get(
    '/workflows/forbidden-boundaries', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await boundaries.getBoundaries(req.tenantId!, {
          moduleCode: req.query.moduleCode as string,
          stepType: req.query.stepType as string,
        });
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/forbidden-boundaries/check',
    authenticate, requirePermission('workflow.instance.read'),
    validate({ body: createCheckBody }),
    async (req: Request, res: Response) => {
      try {
        const { action, moduleCode, entityType, stepType } = req.body;
        if (!action) { res.status(400).json({ error: 'action required' }); return; }
        const result = await boundaries.checkBoundaries(req.tenantId!, action, { moduleCode, entityType, stepType });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/forbidden-boundaries',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: createForbiddenBoundariesBody }),
    async (req: Request, res: Response) => {
      try {
        const boundary = await boundaries.createBoundary(req.tenantId!, req.userId!, req.body);
        setAuditData(res as any, { action: 'create', entityType: 'workflow_forbidden_boundary', entityId: boundary.boundary_id });
        res.status(201).json(boundary);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.delete(
    '/workflows/forbidden-boundaries/:boundaryId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('workflow.autonomous.config'),
    async (req: Request, res: Response) => {
      try {
        const result = await boundaries.deactivateBoundary(req.tenantId!, req.params.boundaryId as string, req.userId!);
        if (!result) { res.status(404).json({ error: 'Boundary not found' }); return; }
        res.json({ deactivated: true });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L2: Mandatory Review Points ──
  router.get(
    '/workflows/mandatory-review-points', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await review.getReviewPoints(req.tenantId!);
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/mandatory-review-points/check',
    authenticate, requirePermission('workflow.instance.read'),
    validate({ body: createCheckBody }),
    async (req: Request, res: Response) => {
      try {
        const { stepType, stepSubType, confidence } = req.body;
        if (!stepType) { res.status(400).json({ error: 'stepType required' }); return; }
        const result = await review.checkReviewRequired(req.tenantId!, stepType, stepSubType, confidence);
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.put(
    '/workflows/mandatory-review-points',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: updateMandatoryReviewPointsBody }),
    async (req: Request, res: Response) => {
      try {
        const point = await review.upsertReviewPoint(req.tenantId!, req.body);
        res.json(point);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L3: Kill Switch ──
  router.post(
    '/workflows/kill-switch',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: activateKillSwitchBody }),
    async (req: Request, res: Response) => {
      try {
        const sw = await killSwitch.activateKillSwitch(req.tenantId!, req.userId!, req.body);
        setAuditData(res as any, { action: 'create', entityType: 'workflow_kill_switch', entityId: sw.switch_id });
        res.status(201).json(sw);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/kill-switch', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const switches = await killSwitch.getActiveKillSwitches(req.tenantId!);
        res.json({ items: switches, count: switches.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/kill-switch/check',
    authenticate, requirePermission('workflow.instance.read'),
    validate({ body: createCheckBody }),
    async (req: Request, res: Response) => {
      try {
        const result = await killSwitch.isKillSwitchActive(req.tenantId!, req.body);
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/kill-switch/:switchId/deactivate',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: createDeactivateBody }),
    async (req: Request, res: Response) => {
      try {
        const result = await killSwitch.deactivateKillSwitch(req.tenantId!, req.params.switchId as string, req.userId!);
        if (!result) { res.status(404).json({ error: 'Kill switch not found or already deactivated' }); return; }
        setAuditData(res as any, { action: 'update', entityType: 'workflow_kill_switch', entityId: req.params.switchId as string });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L3: Intervention Log ──
  router.get(
    '/workflows/interventions', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await killSwitch.getInterventionLog(req.tenantId!, {
          instanceId: req.query.instanceId as string,
          interventionType: req.query.interventionType as string,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        });
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/interventions/:interventionId/acknowledge',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createAcknowledgeBody }),
    async (req: Request, res: Response) => {
      try {
        const result = await killSwitch.acknowledgeIntervention(req.tenantId!, req.params.interventionId as string, req.userId!);
        if (!result) { res.status(404).json({ error: 'Intervention not found or already acknowledged' }); return; }
        res.json({ acknowledged: true });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L3: Rollback / Compensation ──
  router.post(
    '/workflows/rollback',
    authenticate, requirePermission('workflow.autonomous.write'), requireHybridOrHigher(),
    validate({ body: initiateRollbackBody }),
    async (req: Request, res: Response) => {
      try {
        const entry = await rollback.initiateRollback(req.tenantId!, req.userId!, req.body);
        setAuditData(res as any, { action: 'create', entityType: 'workflow_rollback', entityId: entry.rollback_id });
        res.status(201).json(entry);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/rollback/:rollbackId/execute',
    authenticate, requirePermission('workflow.autonomous.write'), requireHybridOrHigher(),
    validate({ body: createExecuteBody }),
    async (req: Request, res: Response) => {
      try {
        const result = await rollback.executeRollback(req.tenantId!, req.params.rollbackId as string, req.userId!, req.body.compensatingState || {});
        if (!result) { res.status(404).json({ error: 'Rollback not found' }); return; }
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/:instanceId/rollbacks', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await rollback.getRollbacksByInstance(req.tenantId!, req.params.instanceId as string);
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/rollbacks/pending', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await rollback.getPendingRollbacks(req.tenantId!);
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── Guardrail Status (combined policy view) ──
  router.get(
    '/workflows/guardrail-status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const [killSwitches_, activeBoundaries, reviewPointsData, budgetData, autonomyData] = await Promise.all([
          killSwitch.getActiveKillSwitches(req.tenantId!),
          boundaries.getBoundaries(req.tenantId!, {}),
          review.getReviewPoints(req.tenantId!),
          budget.getBudget(req.tenantId!, 'daily'),
          stepAutonomy.getStepAutonomyScopes(req.tenantId!, {}),
        ]);

        const budgetCheck_ = await budget.checkBudget(req.tenantId!);

        res.json({
          killSwitch: { active: killSwitches_.length > 0, count: killSwitches_.length, switches: killSwitches_ },
          boundaries: { total: activeBoundaries.length, blocking: activeBoundaries.filter((b: any) => b.severity === 'block' && b.is_active).length, warning: activeBoundaries.filter((b: any) => b.severity === 'warn' && b.is_active).length },
          reviewPoints: { total: reviewPointsData.length, active: reviewPointsData.filter((r: any) => r.is_active).length },
          budget: { configured: !!budgetData, allowed: budgetCheck_.allowed, utilization: budgetCheck_.utilization_pct || 0, remaining: budgetCheck_.remaining_executions || 0 },
          autonomy: { total: autonomyData.length, active: autonomyData.filter((s: any) => s.is_active).length },
          overallHealth: killSwitches_.length === 0 && budgetCheck_.allowed ? 'healthy' : killSwitches_.length > 0 ? 'halted' : 'degraded',
          timestamp: new Date().toISOString(),
        });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );
}

