import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './bulk-invite.service';
import { bulkInviteBody } from './foundation.schemas';
import { bulkRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('bulk_invite'));

router.post('/',
  bulkRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  validate({ body: bulkInviteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const outcome = await svc.runBulkInvite(req.tenantId!, req.body.invites);
    setAuditData(res, {
      entityId: outcome.batch_id,
      entityType: 'bulk_invite',
      action: 'create',
      afterState: { invitedBy: req.user!.userId, totalInvites: outcome.total },
    });
    res.status(201).json({ success: true, data: outcome });
  }),
);

export { router as bulkInviteRouter };
