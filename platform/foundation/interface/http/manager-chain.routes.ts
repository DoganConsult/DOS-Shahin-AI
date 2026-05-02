/**
 * GET /api/foundation/manager-chain/:userId
 *
 * Returns the manager chain for a user — the ordered list of positions from
 * the user's own primary position up to the top of the reporting line, with
 * the current active holder of each position attached. Foundation owns this
 * structure; DAuth, OpenFGA, and DOS orchestration consume it via this API.
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import * as svc from './org-hierarchy.service';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);

router.get('/:userId',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const chain = await svc.getManagerChain(req.tenantId!, req.params.userId);
    res.json({ success: true, data: chain });
  }),
);

// Convenience: caller's own chain (no userId argument). Useful for the
// access-snapshot composer and FE consumers that already have a session.
router.get('/',
  requireAnyPermission('admin', 'org_admin', 'hr_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as { userId?: string } | undefined)?.userId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'No userId on session' });
      return;
    }
    const chain = await svc.getManagerChain(req.tenantId!, userId);
    res.json({ success: true, data: chain });
  }),
);

export { router as managerChainRouter };
