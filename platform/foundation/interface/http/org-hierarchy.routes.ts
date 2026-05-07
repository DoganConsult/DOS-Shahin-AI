import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import * as svc from './org-hierarchy.service';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
const ORG_HIERARCHY_READ_PERMS = ['foundation.data.read', 'foundation.hierarchy.read', 'admin', 'org_admin', 'member'] as const;

router.get('/tree',
  requireAnyPermission(...ORG_HIERARCHY_READ_PERMS),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getOrgTree(req.tenantId!) });
  }),
);

router.get('/subtree/:id',
  requireAnyPermission(...ORG_HIERARCHY_READ_PERMS),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getSubtree(req.tenantId!, req.params.id) });
  }),
);

export { router as orgHierarchyRouter };
