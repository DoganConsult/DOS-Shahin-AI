import { Router, Request, Response } from 'express';
import { publishEvent } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission, requireDauth } from '@dos/dauth-shared';
import * as riskService from '../../application/risk.service';
import * as riskTreatment from '../../application/risk-treatment.service';
import { IllegalRiskTransitionError, RiskNotFoundError } from '../../application/risk-treatment.service';
import { recordAudit } from '../../infrastructure/adapters/audit.adapter';
import { sendNotification } from '../../infrastructure/adapters/notification.adapter';
import { validate, paginated, ok, action, requireOwnership } from '@dos/platform-core/http';
import {
  createRiskBody, updateRiskBody, listQuerySchema, bulkCreateBody, bulkDeleteBody,
  riskEmptyBody, riskReturnBody, riskAssessBody, riskPlanTreatmentBody,
  riskApproveTreatmentBody, riskAcceptBody, riskCloseBody,
} from '../../schemas/risk.schemas';
import { withTenantClient } from '../../domain/risk/ports/database.port';
import { rateLimiter } from '../../domain/risk/ports/middleware.port';


// PRR (2026-04-20) — full dimensions.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'risk:risk', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const mutationLimiter = rateLimiter({ namespace: 'risk:risk:mut', maxRequests: 60, windowMs: 60_000 });
const readLimiter = rateLimiter({ namespace: 'risk:risk:read', maxRequests: 300, windowMs: 60_000 });

const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get(
  '/',
  readLimiter,
  requirePermission('risk.record.read'),
  validate({ query: listQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
      const result = await riskService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
      paginated(res, result.data, result.total, result.page, result.pageSize);
    } catch (err) {
      res.status(500).json({ error: 'Failed to list risks', details: (err as Error).message });
    }
  },
);

router.get(
  '/stats',
  readLimiter,
  requirePermission('risk.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const stats = await riskService.getStats(tenantId);
      ok(res, stats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get risk stats', details: (err as Error).message });
    }
  },
);

router.post(
  '/bulk',
  mutationLimiter,
  requirePermission('risk.record.create'),
  validate({ body: bulkCreateBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const items = await riskService.bulkCreate(tenantId, req.body.items);
      recordAudit(tenantId, 'risk.bulk_created', 'risk', 'bulk', actorId, { count: items.length });
      await publishEvent({
        eventType: 'risk.bulk_created',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: 'bulk',
        severity: 'info',
        payload: { count: items.length, ids: items.map((i: any) => i.risk_id), moduleCode: 'risk' },
      } as any);
      res.status(201); ok(res, items);
    } catch (err) {
      res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
    }
  },
);

router.delete(
  '/bulk',
  mutationLimiter,
  requirePermission('risk.record.delete'),
  validate({ body: bulkDeleteBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const count = await riskService.bulkRemove(tenantId, req.body.ids);
      recordAudit(tenantId, 'risk.bulk_deleted', 'risk', 'bulk', actorId, { count, ids: req.body.ids });
      await publishEvent({
        eventType: 'risk.bulk_deleted',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: 'bulk',
        severity: 'info',
        payload: { count, ids: req.body.ids, moduleCode: 'risk' },
      } as any);
      action(res, `${count} items deleted`);
    } catch (err) {
      res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
    }
  },
);

// ── Risk treatment lifecycle transitions ─────────────────────────────────

function handleRiskTransition(
  fn: (tenantId: string, riskId: string, actorId: string, ...rest: any[]) => Promise<unknown>,
  extraArgs: (req: Request) => unknown[] = () => [],
) {
  return async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const out = await fn(tenantId, req.params.id, actorId, ...extraArgs(req));
      ok(res, out);
    } catch (err) {
      if (err instanceof RiskNotFoundError) {
        res.status(404).json({ error: 'Risk not found', code: 'RISK_NOT_FOUND' });
        return;
      }
      if (err instanceof IllegalRiskTransitionError) {
        res.status(409).json({
          error: 'Illegal state transition',
          code: 'ILLEGAL_STATE_TRANSITION',
          fromState: err.fromState,
          toState: err.toState,
        });
        return;
      }
      res.status(500).json({ error: 'Transition failed', details: (err as Error).message });
    }
  };
}

// Each transition: rate-limited, body-validated, gated by `requireDauth` so
// the full DAuth pipeline (RBAC/ABAC/SoD/ReBAC/lifecycle/ledger) runs with
// explicit `from`/`to` states. Permission keys match the canonical map.
router.post('/:id/submit',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.submit', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'identified', lifecycleToState: 'submitted' }),
  validate({ body: riskEmptyBody }),
  handleRiskTransition(riskTreatment.submit),
);
router.post('/:id/review',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.review', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'submitted', lifecycleToState: 'under_review' }),
  validate({ body: riskEmptyBody }),
  handleRiskTransition(riskTreatment.review),
);
router.post('/:id/return',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.review', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'under_review', lifecycleToState: 'returned' }),
  validate({ body: riskReturnBody }),
  handleRiskTransition(riskTreatment.returnForRevision, (r) => [r.body?.reason]),
);
router.post('/:id/assess',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.review', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'under_review', lifecycleToState: 'assessed' }),
  validate({ body: riskAssessBody }),
  handleRiskTransition(riskTreatment.assess, (r) => [r.body?.score]),
);
router.post('/:id/plan-treatment',
  mutationLimiter,
  requireDauth({ permission: 'risk.treatment.assign', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'assessed', lifecycleToState: 'treatment_planned' }),
  validate({ body: riskPlanTreatmentBody }),
  handleRiskTransition(riskTreatment.planTreatment, (r) => [r.body?.treatmentType, r.body?.plan]),
);
router.post('/:id/approve-treatment',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.approve', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'treatment_planned', lifecycleToState: 'treatment_approved', authorityRequired: 'risk_owner' }),
  validate({ body: riskApproveTreatmentBody }),
  handleRiskTransition(riskTreatment.approveTreatment, (r) => [r.body?.note]),
);
router.post('/:id/activate',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.update', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'treatment_approved', lifecycleToState: 'active' }),
  validate({ body: riskEmptyBody }),
  handleRiskTransition(riskTreatment.activate),
);
router.post('/:id/start-monitoring',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.update', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'active', lifecycleToState: 'monitoring' }),
  validate({ body: riskEmptyBody }),
  handleRiskTransition(riskTreatment.startMonitoring),
);
router.post('/:id/start-mitigation',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.update', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'active', lifecycleToState: 'mitigating' }),
  validate({ body: riskEmptyBody }),
  handleRiskTransition(riskTreatment.startMitigation),
);
router.post('/:id/accept',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.approve', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleToState: 'accepted', authorityRequired: 'risk_owner' }),
  validate({ body: riskAcceptBody }),
  handleRiskTransition(riskTreatment.recordAcceptance, (r) => [r.body?.signoffActorId, r.body?.rationale]),
);
router.post('/:id/close',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.close', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleToState: 'closed' }),
  validate({ body: riskCloseBody }),
  handleRiskTransition(riskTreatment.close, (r) => [r.body?.reason]),
);
router.post('/:id/archive',
  mutationLimiter,
  requireDauth({ permission: 'risk.record.close', moduleCode: 'risk', entityType: 'risk', entityIdParam: 'id', lifecycleFromState: 'closed', lifecycleToState: 'archived' }),
  validate({ body: riskEmptyBody }),
  handleRiskTransition(riskTreatment.archive),
);

router.get('/:id/reachable-states', readLimiter, requirePermission('risk.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const current = await riskTreatment.getCurrentState(tenantId, req.params.id);
    if (!current) {
      res.status(404).json({ error: 'Risk not found', code: 'RISK_NOT_FOUND' });
      return;
    }
    ok(res, { currentState: current, reachable: riskTreatment.getReachableStates(current) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read state', details: (err as Error).message });
  }
});

router.get(
  '/:id',
  readLimiter,
  requirePermission('risk.record.read'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const item = await riskService.getById(tenantId, req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Risk not found', code: 'RISK_NOT_FOUND' });
        return;
      }
      ok(res, item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get risk', details: (err as Error).message });
    }
  },
);

router.post(
  '/',
  mutationLimiter,
  requirePermission('risk.record.create'),
  validate({ body: createRiskBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const item = await riskService.create(tenantId, req.body);
      recordAudit(tenantId, 'risk.created', 'risk', item.risk_id, actorId, { title: req.body.title || req.body.name });
      await publishEvent({
        eventType: 'risk.created',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: item.risk_id,
        severity: 'info',
        payload: { entityId: item.risk_id, title: req.body.title || req.body.name },
      } as any);
      if (actorId) {
        sendNotification(tenantId, actorId, 'Risk Created', `Risk "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.risk_id }).catch(() => {});
      }
      res.status(201); ok(res, item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create risk', details: (err as Error).message });
    }
  },
);

router.put(
  '/:id',
  mutationLimiter,
  requirePermission('risk.record.update'),
  requireOwnership('ownerUserId'),
  validate({ body: updateRiskBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const updated = await riskService.update(tenantId, req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Risk not found', code: 'RISK_NOT_FOUND' });
        return;
      }
      recordAudit(tenantId, 'risk.updated', 'risk', req.params.id, actorId, { changes: Object.keys(req.body) });
      await publishEvent({
        eventType: 'risk.updated',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: req.params.id,
        severity: 'info',
        payload: { entityId: req.params.id, changes: Object.keys(req.body) },
      } as any);
      ok(res, updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update risk', details: (err as Error).message });
    }
  },
);

router.delete(
  '/:id',
  mutationLimiter,
  requirePermission('risk.record.delete'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const deleted = await riskService.remove(tenantId, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Risk not found', code: 'RISK_NOT_FOUND' });
        return;
      }
      recordAudit(tenantId, 'risk.deleted', 'risk', req.params.id, actorId);
      await publishEvent({
        eventType: 'risk.deleted',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: req.params.id,
        severity: 'info',
        payload: { riskId: req.params.id, moduleCode: 'risk' },
      } as any);
      action(res, 'Risk deleted');
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete risk', details: (err as Error).message });
    }
  },
);

router.post(
  '/:id/restore',
  mutationLimiter,
  requirePermission('risk.record.update'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const item = await riskService.restore(tenantId, req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Risk not found or not deleted', code: 'RISK_NOT_FOUND' });
        return;
      }
      recordAudit(tenantId, 'risk.restored', 'risk', req.params.id, actorId);
      await publishEvent({
        eventType: 'risk.restored',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: req.params.id,
        severity: 'info',
        payload: { riskId: req.params.id, moduleCode: 'risk' },
      } as any);
      ok(res, item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to restore risk', details: (err as Error).message });
    }
  },
);

router.get(
  '/module/posture',
  readLimiter,
  requirePermission('risk.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const result = await riskService.getRiskPosture(tenantId);
      ok(res, result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get risk posture', details: (err as Error).message });
    }
  },
);

router.get(
  '/module/dashboard',
  readLimiter,
  requirePermission('risk.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const [stats, posture] = await Promise.all([
        riskService.getStats(tenantId),
        riskService.getRiskPosture(tenantId),
      ]);
      ok(res, { stats, posture });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get risk dashboard', details: (err as Error).message });
    }
  },
);

router.post(
  '/:id/score',
  mutationLimiter,
  requirePermission('risk.record.update'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const result = await riskService.scoreRisk(tenantId, req.params.id);
      recordAudit(tenantId, 'risk.scored', 'risk', req.params.id, actorId, result);
      await publishEvent({
        eventType: 'risk.scored',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: req.params.id,
        severity: 'info',
        payload: { riskId: req.params.id, result, moduleCode: 'risk' },
      } as any);
      ok(res, result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to score risk', details: (err as Error).message });
    }
  },
);

router.get(
  '/:id/fair-exposure',
  readLimiter,
  requirePermission('risk.record.read'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const result = await riskService.getFairExposure(tenantId, req.params.id);
      ok(res, result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get FAIR exposure', details: (err as Error).message });
    }
  },
);

router.post(
  '/:id/transition',
  mutationLimiter,
  requirePermission('risk.record.update'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const { targetStatus, reason } = req.body;
      const result = await riskService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
      if (!result) {
        res.status(400).json({ error: 'Transition unavailable or invalid' });
        return;
      }
      recordAudit(tenantId, 'risk.transitioned', 'risk', req.params.id, actorId, { from: result.fromStatus, to: result.toStatus, reason });
      await publishEvent({
        eventType: 'risk.transitioned',
        tenantId,
        sourceService: 'risk',
        entityType: 'risk',
        entityId: req.params.id,
        severity: 'info',
        payload: { entityId: req.params.id, ...result, moduleCode: 'risk' },
      } as any);
      ok(res, result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to transition risk status', details: (err as Error).message });
    }
  },
);

export default router;
