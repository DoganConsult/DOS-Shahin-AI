/**
 * GET /api/foundation/org-scope/:userId
 * GET /api/foundation/org-scope               (caller's own scope)
 *
 * Returns the user's effective org scope (primary position + BU ancestor
 * chain + organization ancestor chain) computed from dos.* (Foundation's
 * source of truth for hierarchy).
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import * as svc from './org-scope.service';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as { userId?: string } | undefined)?.userId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'No userId on session' });
      return;
    }
    res.json({ success: true, data: await svc.getOrgScope(req.tenantId!, userId) });
  }),
);

router.get('/:userId',
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getOrgScope(req.tenantId!, req.params.userId) });
  }),
);

export { router as orgScopeRouter };
