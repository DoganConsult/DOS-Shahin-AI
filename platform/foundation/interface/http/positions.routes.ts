import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './positions.service';
import { createPositionBody, updatePositionBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';
import { sendCsv } from './csv.util';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('position'));

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'position_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const result = await svc.listPositions(req.tenantId!, {
      page, pageSize,
      bu_id:  req.query.bu_id as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

// W6.F6.4 — CSV export of filtered positions.
router.get('/export',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'position_read'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await svc.listPositions(req.tenantId!, {
      page: 1, pageSize: 50000,
      bu_id:  req.query.bu_id as string | undefined,
      search: req.query.search as string | undefined,
    });
    sendCsv(res, 'positions',
      ['position_id', 'title', 'title_ar', 'bu_id', 'reports_to', 'status', 'created_at'],
      result.data as any[]);
  }),
);

// W3.F3.3 — reporting tree endpoint expected by FE contract.
// Returns flat list of positions with reports_to, FE composes the tree.
router.get('/reporting-tree',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'position_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const tree = await svc.getReportingTree(req.tenantId!);
    res.json({ success: true, data: tree });
  }),
);

router.get('/:id',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'position_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getPosition(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'position', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.get('/:id/holders',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'position_read'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getPositionHolders(req.tenantId!, req.params.id) });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  validate({ body: createPositionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createPosition(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.position_id, entityType: 'position', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.put('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  validate({ body: updatePositionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updatePosition(req.tenantId!, req.params.id, req.body);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'position', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'position', action: 'update' });
    res.json({ success: true, data: row });
  }),
);

router.delete('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deletePosition(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'position', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'position', action: 'delete' });
    res.json({ success: true, message: 'Position deleted' });
  }),
);

export { router as positionsRouter };
