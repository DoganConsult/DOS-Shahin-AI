import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './business-units.service';
import { createBusinessUnitBody, updateBusinessUnitBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('business_unit'));

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'bu_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const result = await svc.listBusinessUnits(req.tenantId!, {
      page, pageSize,
      organization_id: req.query.organization_id as string | undefined,
      search:          req.query.search as string | undefined,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

router.get('/:id',
  requireAnyPermission('admin', 'org_admin', 'bu_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getBusinessUnit(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'business_unit', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: createBusinessUnitBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createBusinessUnit(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.bu_id, entityType: 'business_unit', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.put('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: updateBusinessUnitBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updateBusinessUnit(req.tenantId!, req.params.id, req.body);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'business_unit', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'business_unit', action: 'update' });
    res.json({ success: true, data: row });
  }),
);

router.delete('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deleteBusinessUnit(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'business_unit', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'business_unit', action: 'delete' });
    res.json({ success: true, message: 'Business unit deleted' });
  }),
);

export { router as businessUnitsRouter };
