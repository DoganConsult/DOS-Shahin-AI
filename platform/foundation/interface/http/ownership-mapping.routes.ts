import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './ownership-mapping.service';
import { createOwnershipMappingBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('ownership_mapping'));

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'risk_admin', 'compliance_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await svc.listOwnership(req.tenantId!, {
      entity_type: req.query.entity_type as string | undefined,
      owner_id:    req.query.owner_id as string | undefined,
    });
    res.json({ success: true, data: rows });
  }),
);

router.get('/entity/:entityType/:entityId',
  requireAnyPermission('admin', 'org_admin', 'risk_admin', 'compliance_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await svc.getOwnershipForEntity(req.tenantId!, req.params.entityType, req.params.entityId);
    res.json({ success: true, data: rows });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'risk_admin'),
  validate({ body: createOwnershipMappingBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createOwnership(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.mapping_id, entityType: 'ownership_mapping', action: 'assign' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.delete('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'risk_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.revokeOwnership(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'ownership_mapping', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'ownership_mapping', action: 'revoke' });
    res.json({ success: true, message: 'Ownership mapping revoked' });
  }),
);

// ─────────────────────────────────────────────────────────────────────
// FE-facing domain-scoped routes. The shahin product calls
// `/api/ownership-mapping/:domain` where :domain is "organizations",
// "business-units", "departments", etc. These handlers forward to the
// canonical ones above but default the entity_type filter from the
// URL segment so the FE doesn't need to pass it as a query string.
// ─────────────────────────────────────────────────────────────────────
const DOMAIN_ENTITY_TYPE: Record<string, string> = {
  organizations: 'organization',
  'business-units': 'business_unit',
  departments: 'department',
  positions: 'position',
  locations: 'location',
  teams: 'team',
  committees: 'committee',
  roles: 'role',
  policies: 'policy',
  controls: 'control',
  risks: 'risk',
  assets: 'asset',
};

router.get('/:domain',
  requireAnyPermission('admin', 'org_admin', 'risk_admin', 'compliance_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const domain = req.params.domain;
    if (domain === 'entity') {
      res.status(400).json({ error: 'Missing entity type + id', code: 'BAD_DOMAIN' });
      return;
    }
    const entityType = DOMAIN_ENTITY_TYPE[domain] ?? domain.replace(/-/g, '_').replace(/s$/, '');
    const rows = await svc.listOwnership(req.tenantId!, {
      entity_type: entityType,
      owner_id: req.query.owner_id as string | undefined,
    });
    res.json({ owners: rows, domain, entityType });
  }),
);

router.post('/:domain',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'risk_admin'),
  validate({ body: createOwnershipMappingBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const domain = req.params.domain;
    const entityType = DOMAIN_ENTITY_TYPE[domain] ?? domain.replace(/-/g, '_').replace(/s$/, '');
    const body = { ...req.body, entity_type: req.body?.entity_type ?? entityType };
    const row = await svc.createOwnership(req.tenantId!, body, req.user!.userId);
    setAuditData(res, { entityId: row.mapping_id, entityType: 'ownership_mapping', action: 'assign' });
    res.status(201).json({ success: true, data: row });
  }),
);

// W4.F4.3 — bulk reassign endpoint. FE may target either the canonical
// /api/ownership-mapping/bulk-reassign or domain-scoped /:domain/bulk-reassign.
router.post('/bulk-reassign',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'risk_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await svc.bulkReassignOwnership(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityType: 'ownership_mapping', action: 'bulk_reassign', afterState: result });
    res.json({ success: true, data: result });
  }),
);

router.post('/:domain/bulk-reassign',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'risk_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const domain = req.params.domain;
    const entityType = DOMAIN_ENTITY_TYPE[domain] ?? domain.replace(/-/g, '_').replace(/s$/, '');
    const body = { ...req.body, entity_type: req.body?.entity_type ?? entityType };
    const result = await svc.bulkReassignOwnership(req.tenantId!, body, req.user!.userId);
    setAuditData(res, { entityType: 'ownership_mapping', action: 'bulk_reassign', afterState: { ...result, domain } });
    res.json({ success: true, data: result });
  }),
);

router.delete('/:domain/:ownerId',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'risk_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.revokeOwnership(req.tenantId!, req.params.ownerId);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'ownership_mapping', id: req.params.ownerId });
    setAuditData(res, { entityId: req.params.ownerId, entityType: 'ownership_mapping', action: 'revoke' });
    res.json({ success: true, message: 'Ownership mapping revoked' });
  }),
);

export { router as ownershipMappingRouter };
