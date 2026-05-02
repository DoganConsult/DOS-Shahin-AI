/**
 * Policy Lifecycle Routes — Zod-validated, DAuth-gated
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission, evaluateLifecycleTransition } from '../ports/auth.port';
import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack } from '../ports/middleware.port';
import { PolicyLifecycleService } from '../services/advanced/policy-lifecycle-manager.service';
import { ok, paginated } from '@dos/module-sdk';

const genericPayloadSchema = z.record(z.unknown());

const createPolicySchema = z.object({
  title:         z.string().min(3).max(255),
  description:   z.string().optional(),
  policyType:    z.enum(['internal','regulatory','contractual','iso']).optional(),
  category:      z.string().optional(),
  ownerId:       z.string().uuid().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reviewDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  content:       z.string().optional(),
  contentUrl:    z.string().url().optional(),
  frameworkRefs: z.array(z.string()).optional(),
  tags:          z.array(z.string()).optional(),
});
const attestSchema = z.object({
  attestationType: z.enum(['read_and_understood','acknowledged','certified']).optional(),
  expiresAt:       z.string().datetime({ offset: true }).optional(),
});
const listQuery = z.object({
  status:   z.string().optional(),
  category: z.string().optional(),
  ownerId:  z.string().uuid().optional(),
  limit:    z.coerce.number().int().min(1).max(200).optional(),
  offset:   z.coerce.number().int().min(0).optional(),
});
const idParam = z.object({ id: z.string().uuid() });

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware('policy'));

router.post(
  '/',
  authenticate, requirePermission('policy.documents.create'),
  validate({ body: createPolicySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const id = await PolicyLifecycleService.createPolicy({ tenantId, createdBy: actor.id, ...req.body });
    setAuditData(res, { action: 'policy.created', entityType: 'policy', entityId: id });
    return res.status(201).json(ok({ id }));
  }),
);

router.get(
  '/',
  authenticate, requirePermission('policy.documents.read'),
  validate({ query: listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const result = await PolicyLifecycleService.listPolicies(tenantId, req.query as any);
    return res.json(paginated(result.data, result.total, req.query as any));
  }),
);

router.get(
  '/due-for-review',
  authenticate, requirePermission('policy.documents.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    return res.json(ok(await PolicyLifecycleService.getPoliciesDueForReview(tenantId)));
  }),
);

router.post(
  '/:id/submit',
  authenticate, requirePermission('policy.review.create'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const authResult = await evaluateLifecycleTransition(tenantId, actor.id, {
      moduleCode: 'policy', entityType: 'policy', entityId: req.params.id,
      fromState: 'draft', toState: 'pending_review',
      permissionCode: 'policy.review.create',
      userRoles: actor.roles || [],
    });
    if (!authResult.allowed) {
      return res.status(403).json({ error: 'Transition denied', reason: authResult.reason, checks: authResult.checks });
    }
    await PolicyLifecycleService.submitPolicyForReview(req.params.id, tenantId, actor.id);
    setAuditData(res, { action: 'policy.submitted_for_review', entityType: 'policy', entityId: req.params.id });
    return res.json(ok({ message: 'Policy submitted for review' }));
  }),
);

router.post(
  '/:id/approve',
  authenticate, requirePermission('policy.approval.create'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const authResult = await evaluateLifecycleTransition(tenantId, actor.id, {
      moduleCode: 'policy', entityType: 'policy', entityId: req.params.id,
      fromState: 'pending_review', toState: 'approved',
      permissionCode: 'policy.approval.create',
      userRoles: actor.roles || [],
    });
    if (!authResult.allowed) {
      return res.status(403).json({ error: 'Transition denied', reason: authResult.reason, checks: authResult.checks });
    }
    await PolicyLifecycleService.approvePolicy(req.params.id, tenantId, actor.id);
    setAuditData(res, { action: 'policy.approved', entityType: 'policy', entityId: req.params.id });
    return res.json(ok({ message: 'Policy approved' }));
  }),
);

router.post(
  '/:id/activate',
  authenticate, requirePermission('policy.activation.create'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const authResult = await evaluateLifecycleTransition(tenantId, (req as any).user?.id, {
      moduleCode: 'policy', entityType: 'policy', entityId: req.params.id,
      fromState: 'approved', toState: 'active',
      permissionCode: 'policy.activation.create',
      userRoles: (req as any).user?.roles || [],
    });
    if (!authResult.allowed) {
      return res.status(403).json({ error: 'Transition denied', reason: authResult.reason, checks: authResult.checks });
    }
    await PolicyLifecycleService.activatePolicy(req.params.id, tenantId);
    setAuditData(res, { action: 'policy.activated', entityType: 'policy', entityId: req.params.id });
    return res.json(ok({ message: 'Policy activated' }));
  }),
);

router.post(
  '/:id/archive',
  authenticate, requirePermission('policy.archive.create'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const authResult = await evaluateLifecycleTransition(tenantId, actor.id, {
      moduleCode: 'policy', entityType: 'policy', entityId: req.params.id,
      fromState: 'active', toState: 'archived',
      permissionCode: 'policy.archive.create',
      userRoles: actor.roles || [],
    });
    if (!authResult.allowed) {
      return res.status(403).json({ error: 'Transition denied', reason: authResult.reason, checks: authResult.checks });
    }
    await PolicyLifecycleService.archivePolicy(req.params.id, tenantId, actor.id);
    setAuditData(res, { action: 'policy.archived', entityType: 'policy', entityId: req.params.id });
    return res.json(ok({ message: 'Policy archived' }));
  }),
);

router.post(
  '/:id/attest',
  authenticate, requirePermission('policy.attestation.create'),
  validate({ params: idParam, body: attestSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await PolicyLifecycleService.recordAttestation(
      req.params.id, tenantId, actor.id,
      req.body.attestationType, req.body.expiresAt,
    );
    setAuditData(res, { action: 'policy.attested', entityType: 'policy', entityId: req.params.id });
    return res.json(ok({ message: 'Attestation recorded' }));
  }),
);

export default router;
