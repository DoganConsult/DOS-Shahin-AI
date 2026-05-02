import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './user-lifecycle.service';
import { offboardBody, suspendBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('user_lifecycle'));

router.post('/:userId/onboard',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.onboard(req.tenantId!, req.params.userId);
    if (!row) throw new UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    setAuditData(res, { entityId: req.params.userId, entityType: 'user', action: 'onboard' });
    res.json({ success: true, data: row, message: 'User onboarded successfully' });
  }),
);

router.post('/:userId/offboard',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  validate({ body: offboardBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.offboard(req.tenantId!, req.params.userId);
    if (!row) throw new UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    setAuditData(res, {
      entityId: req.params.userId, entityType: 'user', action: 'offboard',
      afterState: { offboardedBy: req.user!.userId, reason: req.body.reason },
    });
    res.json({ success: true, data: row, message: 'User offboarded successfully' });
  }),
);

router.post('/:userId/suspend',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  validate({ body: suspendBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.suspend(req.tenantId!, req.params.userId);
    if (!row) throw new UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    setAuditData(res, {
      entityId: req.params.userId, entityType: 'user', action: 'suspend',
      afterState: { reason: req.body.reason },
    });
    res.json({ success: true, data: row, message: 'User suspended' });
  }),
);

router.post('/:userId/reactivate',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.reactivate(req.tenantId!, req.params.userId);
    if (!row) throw new UserServiceError('USER_NOT_FOUND', undefined, { userId: req.params.userId });
    setAuditData(res, { entityId: req.params.userId, entityType: 'user', action: 'reactivate' });
    res.json({ success: true, data: row, message: 'User reactivated' });
  }),
);

export { router as userLifecycleRouter };
