import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './locations.service';
import { createLocationBody, updateLocationBody, assignLocationBuBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';
import { sendCsv } from './csv.util';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('location'));

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'location_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const result = await svc.listLocations(req.tenantId!, {
      page, pageSize,
      location_type: req.query.location_type as string | undefined,
      country:       req.query.country as string | undefined,
      parent_id:     req.query.parent_id as string | undefined,
      search:        req.query.search as string | undefined,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

// W6.F6.4 — CSV export of the current filtered location list. Hard cap at 50k rows.
router.get('/export',
  requireAnyPermission('admin', 'org_admin', 'location_read'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await svc.listLocations(req.tenantId!, {
      page: 1, pageSize: 50000,
      location_type: req.query.location_type as string | undefined,
      country:       req.query.country as string | undefined,
      parent_id:     req.query.parent_id as string | undefined,
      search:        req.query.search as string | undefined,
    });
    sendCsv(res, 'locations',
      ['location_id', 'name', 'name_ar', 'location_type', 'country', 'city', 'parent_id', 'status', 'created_at'],
      result.data as any[]);
  }),
);

router.get('/:id',
  requireAnyPermission('admin', 'org_admin', 'location_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getLocation(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'location', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.get('/:id/children',
  requireAnyPermission('admin', 'org_admin', 'location_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listChildLocations(req.tenantId!, req.params.id) });
  }),
);

router.get('/:id/business-units',
  requireAnyPermission('admin', 'org_admin', 'location_read'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listLocationBUs(req.tenantId!, req.params.id) });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: createLocationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createLocation(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.location_id, entityType: 'location', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.put('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: updateLocationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updateLocation(req.tenantId!, req.params.id, req.body);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'location', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'location', action: 'update' });
    res.json({ success: true, data: row });
  }),
);

router.delete('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deleteLocation(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'location', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'location', action: 'delete' });
    res.json({ success: true, message: 'Location deleted' });
  }),
);

router.post('/:id/business-units',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: assignLocationBuBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await svc.assignBuToLocation(req.tenantId!, req.params.id, req.body.bu_id);
    setAuditData(res, { entityId: `${req.params.id}:${req.body.bu_id}`, entityType: 'location_bu', action: 'assign' });
    res.status(201).json({ success: true, message: 'Business unit assigned to location' });
  }),
);

router.delete('/:id/business-units/:buId',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    await svc.removeBuFromLocation(req.tenantId!, req.params.id, req.params.buId);
    setAuditData(res, { entityId: `${req.params.id}:${req.params.buId}`, entityType: 'location_bu', action: 'remove' });
    res.json({ success: true, message: 'Business unit removed from location' });
  }),
);

export { router as locationsRouter };
