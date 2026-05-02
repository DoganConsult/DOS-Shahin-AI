import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './delegation.service';
import { createDelegationBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { hasAdminRole } from './middleware/ownership';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('delegation'));

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const direction = (req.query.direction as 'from' | 'to' | 'both') || 'both';
    const rows = await svc.listDelegations(req.tenantId!, {
      actorId: req.user!.userId,
      isAdmin: hasAdminRole(req),
      direction,
    });
    res.json({ success: true, data: rows });
  }),
);

router.get('/:id',
  requireAnyPermission('admin', 'org_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getDelegation(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'member'),
  validate({ body: createDelegationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.userId;
    const delegator = req.body.delegator_id ?? actorId;
    if (delegator === req.body.delegate_id) {
      res.status(400).json({ error: 'Cannot delegate to yourself', code: 'VALIDATION_FAILED' });
      return;
    }
    const row = await svc.createDelegation(req.tenantId!, req.body, actorId);
    setAuditData(res, { entityId: row.delegation_id, entityType: 'delegation', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.delete('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.revokeDelegation(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'delegation', action: 'revoke' });
    res.json({ success: true, message: 'Delegation revoked' });
  }),
);

// W4.F4.2 — explicit lifecycle endpoints (FE contract: POST /:id/approve|reject|revoke).
router.post('/:id/approve',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.approveDelegation(req.tenantId!, req.params.id, req.user!.userId);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'delegation', action: 'approve' });
    res.json({ success: true, data: row });
  }),
);

router.post('/:id/reject',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const reason = (req.body?.reason ?? '').toString().trim();
    if (!reason) {
      res.status(400).json({ success: false, error: 'reason required' });
      return;
    }
    const row = await svc.rejectDelegation(req.tenantId!, req.params.id, req.user!.userId, reason);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'delegation', action: 'reject' });
    res.json({ success: true, data: row });
  }),
);

router.post('/:id/revoke',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.revokeDelegation(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'delegation', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'delegation', action: 'revoke' });
    res.json({ success: true, message: 'Delegation revoked' });
  }),
);

export { router as delegationRouter };
