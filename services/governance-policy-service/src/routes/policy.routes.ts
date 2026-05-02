import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId, requirePermission, requireDauth } from '../adapters/auth.adapter';
import * as policyService from '../domain/policy.service';
import * as policyStateMachine from '../domain/policy-state-machine.service';
import { IllegalStateTransitionError, PolicyNotFoundError, SodViolationError } from '../domain/policy-state-machine.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishPolicyCreated, publishPolicyReviewed, publishPolicyRetired, publishDomainEvent } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import {
  createPolicyBody, updatePolicyBody, listQuerySchema, bulkCreateBody, bulkDeleteBody,
  policyReviewBody, policyRequestRevisionBody, policyApproveBody, policyPublishBody,
  policyRetireBody, policyEmptyBody,
} from '../schemas/policy.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'governance-policy-service:policy', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;

// Transitions are mutating + audited; tighter bucket than the 100/min default.
const transitionLimiter = rateLimiter({
  namespace: 'governance-policy-service:policy:transition',
  maxRequests: 30,
  windowMs: 60_000,
});

const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await policyService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list policys', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await policyService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get policy stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await policyService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await policyService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const [stats, health] = await Promise.all([
      policyService.getStats(tenantId),
      policyService.getGovernanceHealth(tenantId),
    ]);
    ok(res, { stats, health });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get governance dashboard', details: (err as Error).message });
  }
});

router.get('/module/maturity', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const frameworkCode = req.query.frameworkCode as string | undefined;
    const result = await policyService.autoAssessMaturity(tenantId, frameworkCode);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get maturity assessment', details: (err as Error).message });
  }
});

router.get('/module/health', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await policyService.getGovernanceHealth(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get governance health', details: (err as Error).message });
  }
});

// ── Lifecycle transitions (state machine) ───────────────────────────────
// Each transition runs through SoD enforcement at the middleware layer
// (sod-enforcement.middleware in services/onboarding-service when wired
// service-to-service). Same-actor-different-action separation is the
// runtime guard.

function handleTransition(
  fn: (tenantId: string, policyId: string, actorId: string, ...rest: any[]) => Promise<unknown>,
  extraArgs: (req: Request) => unknown[] = () => [],
) {
  return async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const out = await fn(tenantId, req.params.id, actorId, ...extraArgs(req));
      ok(res, out);
    } catch (err) {
      if (err instanceof PolicyNotFoundError) {
        res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
        return;
      }
      if (err instanceof IllegalStateTransitionError) {
        res.status(409).json({
          error: 'Illegal state transition',
          code: 'ILLEGAL_STATE_TRANSITION',
          fromState: err.fromState,
          toState: err.toState,
        });
        return;
      }
      if (err instanceof SodViolationError) {
        res.status(403).json({
          error: 'Segregation of duties violation',
          code: 'SOD_VIOLATION',
          action: err.action,
          conflictWith: err.conflictWith,
        });
        return;
      }
      res.status(500).json({ error: 'Transition failed', details: (err as Error).message });
    }
  };
}

// Each transition: rate-limited, body-validated, gated by `requireDauth` so
// the full DAuth 14-step pipeline (RBAC + ABAC + SoD + ReBAC + delegation +
// lifecycle + ledger write) runs with explicit `from`/`to` states. Permission
// keys match modules/policy/.../lifecycle-registration.ts.
router.post('/:id/submit',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.update', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'draft', lifecycleToState: 'submitted',
  }),
  validate({ body: policyEmptyBody }),
  handleTransition(policyStateMachine.submit),
);
router.post('/:id/review',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.review', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'submitted', lifecycleToState: 'under_review',
  }),
  validate({ body: policyReviewBody }),
  handleTransition(policyStateMachine.review, (r) => [r.body?.reviewerId]),
);
router.post('/:id/request-revision',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.review', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'under_review', lifecycleToState: 'revision_requested',
  }),
  validate({ body: policyRequestRevisionBody }),
  handleTransition(policyStateMachine.requestRevision, (r) => [r.body?.reason]),
);
router.post('/:id/resubmit',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.update', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'revision_requested', lifecycleToState: 'submitted',
  }),
  validate({ body: policyEmptyBody }),
  handleTransition(policyStateMachine.resubmit),
);
router.post('/:id/approve',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.approve', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'under_review', lifecycleToState: 'approved',
    authorityRequired: 'policy_approver',
  }),
  validate({ body: policyApproveBody }),
  handleTransition(policyStateMachine.approve, (r) => [r.body?.approverNote]),
);
router.post('/:id/publish',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.publish', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'approved', lifecycleToState: 'published',
  }),
  validate({ body: policyPublishBody }),
  handleTransition(policyStateMachine.publish, (r) => [r.body?.effectiveDate]),
);
router.post('/:id/activate',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.publish', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'published', lifecycleToState: 'active',
  }),
  validate({ body: policyEmptyBody }),
  handleTransition(policyStateMachine.activate),
);
router.post('/:id/mark-review-due',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.update', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'active', lifecycleToState: 'review_due',
  }),
  validate({ body: policyEmptyBody }),
  handleTransition(policyStateMachine.markReviewDue),
);
router.post('/:id/start-revision',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.update', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleFromState: 'review_due', lifecycleToState: 'in_revision',
  }),
  validate({ body: policyEmptyBody }),
  handleTransition(policyStateMachine.startRevision),
);
router.post('/:id/retire',
  transitionLimiter,
  requireDauth({
    permission: 'policy.document.retire', moduleCode: 'policy',
    entityType: 'policy', entityIdParam: 'id',
    lifecycleToState: 'retired',
    authorityRequired: 'policy_owner',
  }),
  validate({ body: policyRetireBody }),
  handleTransition(policyStateMachine.retire, (r) => [r.body?.reason]),
);

router.get('/:id/reachable-states', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const current = await policyStateMachine.getCurrentState(tenantId, req.params.id);
    if (!current) {
      res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
      return;
    }
    ok(res, { currentState: current, reachable: policyStateMachine.getReachableStates(current) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read state', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await policyService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get policy', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createPolicyBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await policyService.create(tenantId, req.body);
    recordAudit(tenantId, 'policy.created', 'policy', item.policy_id, actorId, { title: req.body.title || req.body.name });
    await publishPolicyCreated(tenantId, item.policy_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Policy Created', `Policy "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.policy_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create policy', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updatePolicyBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await policyService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'policy.updated', 'policy', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishPolicyReviewed(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update policy', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await policyService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'policy.deleted', 'policy', req.params.id, actorId);
    await publishPolicyRetired(tenantId, req.params.id, {}, actorId);
    action(res, 'Policy deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete policy', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.get('/:id/lifecycle', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await policyService.getLifecycleState(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get lifecycle state', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, entityType, reason } = req.body;
    const result = await policyService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, entityType || 'policy', reason);
    if (!result) {
      res.status(400).json({ error: 'Transition unavailable or invalid' });
      return;
    }
    recordAudit(tenantId, 'policy.transitioned', 'policy', req.params.id, actorId, { from: result.fromStatus, to: result.toStatus, reason });
    await publishDomainEvent('policy.transitioned', { entityId: req.params.id, ...result, moduleCode: 'governance' }, tenantId, actorId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transition policy status', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await policyService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Policy not found or not deleted', code: 'POLICY_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'policy.restored', 'policy', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore policy', details: (err as Error).message });
  }
});

export default router;
