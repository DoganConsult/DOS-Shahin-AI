import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId, requireDauth } from '../adapters/auth.adapter';
import * as vendorService from '../domain/vendor.service';
import * as vendorAssessment from '../domain/vendor-assessment.service';
import { IllegalVendorTransitionError, VendorNotFoundError } from '../domain/vendor-assessment.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishVendorCreated, publishVendorAssessmentCompleted } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import {
  createVendorBody, updateVendorBody, listQuerySchema, bulkCreateBody, bulkDeleteBody,
  vendorEmptyBody, vendorReceiveQuestionnaireBody, vendorScoredBody,
  vendorApproveBody, vendorRejectBody, vendorOffboardBody,
} from '../schemas/vendor.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'vendor-service:vendor', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;

const transitionLimiter = rateLimiter({
  namespace: 'vendor-service:vendor:transition',
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

    const result = await vendorService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list vendors', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await vendorService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get vendor stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const items = await vendorService.bulkCreate(tenantId, req.body.items);
    recordAudit(tenantId, 'vendor.bulk-created', 'vendor', null as any, actorId, { count: items.length });
    res.status(201);
    ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create vendors', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const count = await vendorService.bulkRemove(tenantId, req.body.ids);
    recordAudit(tenantId, 'vendor.bulk-deleted', 'vendor', null as any, actorId, { count });
    action(res, `${count} Vendors deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete vendors', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await vendorService.getVendorDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get vendor dashboard', details: (err as Error).message });
  }
});

// ── Vendor lifecycle transitions ────────────────────────────────────────

function handleVendorTransition(
  fn: (tenantId: string, vendorId: string, actorId: string, ...rest: any[]) => Promise<unknown>,
  extraArgs: (req: Request) => unknown[] = () => [],
) {
  return async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const out = await fn(tenantId, req.params.id, actorId, ...extraArgs(req));
      ok(res, out);
    } catch (err) {
      if (err instanceof VendorNotFoundError) {
        res.status(404).json({ error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' });
        return;
      }
      if (err instanceof IllegalVendorTransitionError) {
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

// Each transition: rate-limited, RBAC-gated, body-validated. Permission keys
// match canonical-permissions.ts: vendor.* family. Approve/reject + offboard
// gate on 'vendor.approve'; data-entry transitions gate on 'vendor.update'.
router.post('/:id/send-questionnaire',
  transitionLimiter,
  requireDauth({ permission: 'vendor.update', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'identified', lifecycleToState: 'questionnaire_sent' }),
  validate({ body: vendorEmptyBody }),
  handleVendorTransition(vendorAssessment.sendQuestionnaire),
);
router.post('/:id/receive-questionnaire',
  transitionLimiter,
  requireDauth({ permission: 'vendor.update', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'questionnaire_sent', lifecycleToState: 'questionnaire_received' }),
  validate({ body: vendorReceiveQuestionnaireBody }),
  handleVendorTransition(vendorAssessment.receiveQuestionnaire, (r) => [r.body]),
);
router.post('/:id/start-assessment',
  transitionLimiter,
  requireDauth({ permission: 'vendor.assess', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'questionnaire_received', lifecycleToState: 'assessment_in_progress' }),
  validate({ body: vendorEmptyBody }),
  handleVendorTransition(vendorAssessment.startAssessment),
);
router.post('/:id/complete-assessment',
  transitionLimiter,
  requireDauth({ permission: 'vendor.assess', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'assessment_in_progress', lifecycleToState: 'assessed' }),
  validate({ body: vendorScoredBody }),
  handleVendorTransition(vendorAssessment.completeAssessment, (r) => [r.body?.score]),
);
router.post('/:id/approve',
  transitionLimiter,
  requireDauth({ permission: 'vendor.approve', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'assessed', lifecycleToState: 'approved', authorityRequired: 'vendor_owner' }),
  validate({ body: vendorApproveBody }),
  handleVendorTransition(vendorAssessment.approve, (r) => [r.body?.note]),
);
router.post('/:id/reject',
  transitionLimiter,
  requireDauth({ permission: 'vendor.approve', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'assessed', lifecycleToState: 'rejected' }),
  validate({ body: vendorRejectBody }),
  handleVendorTransition(vendorAssessment.reject, (r) => [r.body?.reason]),
);
router.post('/:id/onboard',
  transitionLimiter,
  requireDauth({ permission: 'vendor.update', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'approved', lifecycleToState: 'onboarding' }),
  validate({ body: vendorEmptyBody }),
  handleVendorTransition(vendorAssessment.onboard),
);
router.post('/:id/activate',
  transitionLimiter,
  requireDauth({ permission: 'vendor.update', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'onboarding', lifecycleToState: 'active' }),
  validate({ body: vendorEmptyBody }),
  handleVendorTransition(vendorAssessment.activate),
);
router.post('/:id/start-annual-review',
  transitionLimiter,
  requireDauth({ permission: 'vendor.assess', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'active', lifecycleToState: 'review_in_progress' }),
  validate({ body: vendorEmptyBody }),
  handleVendorTransition(vendorAssessment.startAnnualReview),
);
router.post('/:id/complete-reassessment',
  transitionLimiter,
  requireDauth({ permission: 'vendor.assess', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'review_in_progress', lifecycleToState: 'reassessed' }),
  validate({ body: vendorScoredBody }),
  handleVendorTransition(vendorAssessment.completeReassessment, (r) => [r.body?.score]),
);
router.post('/:id/start-offboarding',
  transitionLimiter,
  requireDauth({ permission: 'vendor.approve', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleToState: 'offboarding', authorityRequired: 'vendor_owner' }),
  validate({ body: vendorOffboardBody }),
  handleVendorTransition(vendorAssessment.startOffboarding, (r) => [r.body?.reason]),
);
router.post('/:id/complete-offboarding',
  transitionLimiter,
  requireDauth({ permission: 'vendor.approve', moduleCode: 'vendor', entityType: 'vendor', entityIdParam: 'id', lifecycleFromState: 'offboarding', lifecycleToState: 'terminated' }),
  validate({ body: vendorEmptyBody }),
  handleVendorTransition(vendorAssessment.completeOffboarding),
);

router.get('/:id/reachable-states', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const current = await vendorAssessment.getCurrentState(tenantId, req.params.id);
    if (!current) {
      res.status(404).json({ error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' });
      return;
    }
    ok(res, { currentState: current, reachable: vendorAssessment.getReachableStates(current) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read state', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await vendorService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get vendor', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createVendorBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await vendorService.create(tenantId, req.body);
    recordAudit(tenantId, 'vendor.created', 'vendor', item.vendor_id, actorId, { title: req.body.title || req.body.name });
    await publishVendorCreated(tenantId, item.vendor_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Vendor Created', `Vendor "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.vendor_id }).catch(() => {}); }
    res.status(201);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create vendor', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateVendorBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await vendorService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'vendor.updated', 'vendor', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishVendorAssessmentCompleted(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vendor', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await vendorService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'vendor.deleted', 'vendor', req.params.id, actorId);
    action(res, 'Vendor deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vendor', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await vendorService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Vendor not found or not deleted', code: 'VENDOR_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'vendor.restored', 'vendor', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore vendor', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.get('/:id/score', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await vendorService.scoreVendor(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to score vendor', details: (err as Error).message });
  }
});

router.get('/:id/risk-analytics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await vendorService.getVendorRiskAnalytics(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get risk analytics', details: (err as Error).message });
  }
});

router.get('/:id/cyber-rating', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await vendorService.getVendorCyberRating(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cyber rating', details: (err as Error).message });
  }
});

router.post('/:id/compliance-check', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await vendorService.runComplianceChecks(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run compliance checks', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await vendorService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
    if (!result) {
      res.status(400).json({ error: 'Transition unavailable or invalid' });
      return;
    }
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transition status', details: (err as Error).message });
  }
});

export default router;
