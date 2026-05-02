import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { requireSodClearance } from '@dos/dauth-shared';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { safeQuery } from '../../ports/database.port';
import * as svc from './access-review.service';
import { createAccessReviewBody, decideAccessReviewItemBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('access_review'));

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const result = await svc.listReviews(req.tenantId!, {
      page, pageSize, status: req.query.status as string | undefined,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

// ─────────────────────────────────────────────────────────────────────
// FE-alias routes — the shahin product calls "/campaigns" for the same
// resource. Must be registered BEFORE `/:id` so Express doesn't match
// the literal "campaigns" as a campaign id. Non-uuid `:id` values would
// reach svc.getReview and crash the Postgres query with 22P02.
// ─────────────────────────────────────────────────────────────────────
router.get('/campaigns',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const result = await svc.listReviews(req.tenantId!, {
      page, pageSize, status: req.query.status as string | undefined,
    });
    res.json({ campaigns: result.data, total: result.total, page, pageSize });
  }),
);

router.get('/campaigns/:id/items',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ items: await svc.listItems(req.tenantId!, req.params.id) });
  }),
);

router.get('/campaigns/:id',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getReview(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.post('/campaigns',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  validate({ body: createAccessReviewBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createReview(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.review_id, entityType: 'access_review', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.put('/campaigns/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updateReview(req.tenantId!, req.params.id, req.body ?? {});
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'access_review', action: 'update' });
    res.json({ success: true, data: row });
  }),
);

router.delete('/campaigns/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deleteReview(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'access_review', action: 'delete' });
    res.json({ success: true, message: 'Campaign cancelled' });
  }),
);

router.put('/campaigns/:id/start',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.startReview(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'access_review', action: 'start' });
    res.json({ success: true, data: row });
  }),
);

router.put('/items/:itemId/decision',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  validate({ body: decideAccessReviewItemBody }),
  asyncHandler(async (req: Request, res: Response) => {
    
    const { rows: found } = await safeQuery(
      `SELECT review_id FROM dos.access_review_items WHERE item_id = $1 AND tenant_id = $2 LIMIT 1`,
      [req.params.itemId, req.tenantId!],
    ).catch(() => ({ rows: [] as any[] }));
    if (found.length === 0) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review_item', id: req.params.itemId });
    const row = await svc.decideItem(req.tenantId!, found[0].review_id, req.params.itemId, req.body.decision, req.body.comment ?? null, req.user!.userId);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review_item', id: req.params.itemId });
    setAuditData(res, { entityId: req.params.itemId, entityType: 'access_review_item', action: 'decide', afterState: { decision: req.body.decision } });
    res.json({ success: true, data: row });
  }),
);

router.get('/:id',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getReview(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.get('/:id/items',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'access_review_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listItems(req.tenantId!, req.params.id) });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  validate({ body: createAccessReviewBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createReview(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.review_id, entityType: 'access_review', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.put('/:id/items/:itemId/decide',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  validate({ body: decideAccessReviewItemBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.decideItem(req.tenantId!, req.params.id, req.params.itemId, req.body.decision, req.body.comment ?? null, req.user!.userId);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review_item', id: req.params.itemId });
    setAuditData(res, { entityId: req.params.itemId, entityType: 'access_review_item', action: 'decide', afterState: { decision: req.body.decision } });
    res.json({ success: true, data: row });
  }),
);

router.post('/:id/close',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'access_review_admin'),
  requireSodClearance({ moduleCode: 'access-review', action: 'close' }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.closeReview(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'access_review', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'access_review', action: 'close' });
    res.json({ success: true, data: row, message: 'Access review closed' });
  }),
);

export { router as accessReviewRouter };
