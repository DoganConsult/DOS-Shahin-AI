/**
 * Evidence Core Routes — Zod-validated, DAuth-gated
 * Wires EvidenceService into Express router.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack } from '../ports/middleware.port';
import { EvidenceService } from '../services/core/evidence.service';
import { ok, paginated } from '@dos/module-sdk';

const genericPayloadSchema = z.record(z.unknown());

// ── Zod schemas ──────────────────────────────────────────────────
const collectSchema = z.object({
  title:        z.string().min(3).max(255),
  description:  z.string().optional(),
  evidenceType: z.enum(['document','screenshot','log','test_result','policy','report','other']),
  entityType:   z.string().optional(),
  entityId:     z.string().uuid().optional(),
  fileUrl:      z.string().url().optional(),
  fileName:     z.string().max(255).optional(),
  fileSize:     z.number().int().positive().optional(),
  mimeType:     z.string().optional(),
  hashSha256:   z.string().length(64).optional(),
  validFrom:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validTo:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metadata:     z.record(z.unknown()).optional(),
});

const reviewSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  notes:    z.string().optional(),
});

const linkSchema = z.object({
  linkedEntityType: z.string().min(1),
  linkedEntityId:   z.string().uuid(),
  linkType:         z.string().optional(),
});

const requestSchema = z.object({
  entityType:   z.string().min(1),
  entityId:     z.string().uuid(),
  title:        z.string().min(3).max(255),
  assignedTo:   z.string().uuid().optional(),
  instructions: z.string().optional(),
  dueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const listQuery = z.object({
  status:       z.enum(['draft','submitted','under_review','accepted','rejected','expired']).optional(),
  evidenceType: z.string().optional(),
  limit:        z.coerce.number().int().min(1).max(200).optional(),
  offset:       z.coerce.number().int().min(0).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

// ── Router ───────────────────────────────────────────────────────
const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware('evidence'));

router.post(
  '/',
  authenticate, requirePermission('evidence.items.create'),
  validate({ body: collectSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const id = await EvidenceService.collectEvidence({ tenantId, collectedBy: actor?.id ?? actor?.userId, ...req.body });
    setAuditData(res as any, { action: 'evidence.collected', entityType: 'evidence', entityId: id });
    return res.status(201).json(ok({ id }, req));
  }),
);

router.get(
  '/',
  authenticate, requirePermission('evidence.items.read'),
  validate({ query: listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const result = await EvidenceService.listEvidence(tenantId, req.query as any);
    const page = Number((req.query as any).page) || 1;
    const limit = Number((req.query as any).limit) || 50;
    return res.json(paginated(result.data as any[], result.total, page, limit, req));
  }),
);

router.post(
  '/:id/submit',
  authenticate, requirePermission('evidence.submission.create'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    await EvidenceService.submitEvidence(req.params.id, tenantId);
    setAuditData(res as any, { action: 'evidence.submitted', entityType: 'evidence', entityId: req.params.id });
    return res.json(ok({ message: 'Evidence submitted for review' }, req));
  }),
);

router.post(
  '/:id/review',
  authenticate, requirePermission('evidence.review.create'),
  validate({ params: idParam, body: reviewSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await EvidenceService.reviewEvidence(
      req.params.id, tenantId, actor?.id ?? actor?.userId, req.body.decision, req.body.notes,
    );
    setAuditData(res as any, { action: `evidence.${req.body.decision}`, entityType: 'evidence', entityId: req.params.id });
    return res.json(ok({ message: `Evidence ${req.body.decision}` }, req));
  }),
);

router.post(
  '/:id/link',
  authenticate, requirePermission('evidence.links.create'),
  validate({ params: idParam, body: linkSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await EvidenceService.linkEvidenceToEntity(
      req.params.id, tenantId,
      req.body.linkedEntityType, req.body.linkedEntityId,
      req.body.linkType, actor.id,
    );
    return res.json(ok({ message: 'Evidence linked' }, req));
  }),
);

router.get(
  '/entity/:entityType/:entityId',
  authenticate, requirePermission('evidence.items.read'),
  validate({ params: z.object({ entityType: z.string(), entityId: z.string().uuid() }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const items = await EvidenceService.getEvidenceForEntity(
      req.params.entityType, req.params.entityId, tenantId,
    );
    return res.json(ok(items, req));
  }),
);

router.post(
  '/requests',
  authenticate, requirePermission('evidence.requests.create'),
  validate({ body: requestSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const id = await EvidenceService.requestEvidence(tenantId, { requestedBy: actor?.id ?? actor?.userId, ...req.body });
    return res.status(201).json(ok({ id }, req));
  }),
);

export default router;

