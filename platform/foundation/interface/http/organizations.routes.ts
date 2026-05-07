import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './organizations.service';
import { createOrganizationBody, updateOrganizationBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('organization'));
const ORG_READ_PERMS = ['foundation.data.read', 'admin', 'org_admin', 'org_read', 'member'] as const;

router.get('/',
  requireAnyPermission(...ORG_READ_PERMS),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const search = req.query.search as string | undefined;
    const result = await svc.listOrganizations(req.tenantId!, { page, pageSize, search });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

router.get('/:id',
  requireAnyPermission(...ORG_READ_PERMS),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getOrganization(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'organization', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: createOrganizationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createOrganization(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.organization_id, entityType: 'organization', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.put('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: updateOrganizationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updateOrganization(req.tenantId!, req.params.id, req.body);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'organization', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'organization', action: 'update' });
    res.json({ success: true, data: row });
  }),
);

router.delete('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deleteOrganization(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'organization', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'organization', action: 'delete' });
    res.json({ success: true, message: 'Organization deleted' });
  }),
);

export { router as organizationsRouter };
