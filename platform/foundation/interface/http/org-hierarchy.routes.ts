import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import * as svc from './org-hierarchy.service';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);

router.get('/tree',
  requireAnyPermission('admin', 'org_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getOrgTree(req.tenantId!) });
  }),
);

router.get('/subtree/:id',
  requireAnyPermission('admin', 'org_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getSubtree(req.tenantId!, req.params.id) });
  }),
);

export { router as orgHierarchyRouter };
