/**
 * GET /api/foundation/access-snapshot
 * GET /api/foundation/access-snapshot/:userId  (admin-only override)
 *
 * Returns the unified access snapshot composed from Foundation
 * (org-scope, manager chain, current position, inheritance) and DAuth
 * (recent denials, pending approvals via authz_decision_log). FE consumers
 * read this once per session and on token refresh; the single guard
 * `accessSnapshotGuard` (Phase D) reads from this response.
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import * as svc from './access-snapshot.service';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);

router.get('/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as { userId?: string } | undefined)?.userId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'No userId on session' });
      return;
    }
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined);
    const snapshot = await svc.getAccessSnapshot(req.tenantId!, userId, correlationId);
    // Cache hint: snapshots are recomputed at refresh time. FE consumers
    // should treat them as session-bound and revalidate on token refresh.
    res.set('Cache-Control', 'private, max-age=30');
    res.json({ success: true, data: snapshot });
  }),
);

router.get('/:userId',
  requireAnyPermission('admin', 'org_admin', 'hr_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined);
    const snapshot = await svc.getAccessSnapshot(req.tenantId!, req.params.userId, correlationId);
    res.json({ success: true, data: snapshot });
  }),
);

export { router as accessSnapshotRouter };
