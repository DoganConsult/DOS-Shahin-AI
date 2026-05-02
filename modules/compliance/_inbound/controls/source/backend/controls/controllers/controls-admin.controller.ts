import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';

const router = Router();
router.use(moduleStack('controls'));
router.use(auditMiddleware('controls'));

router.get(
  '/settings',
  authenticate,
  requirePermission('admin.system.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: [] });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('admin.system.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: {} });
  }),
);

export default router;
