import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/platform-core/http';
import { authenticate } from '../middleware/session.middleware';
import {
  buildFrontendAccessContract,
  getMinimalAccessContract,
  getNavigationContract,
  getPermissionContract,
  getContractVersion,
} from '../frontend-contracts/frontend-access-contract.service';
import { getAccessSnapshot } from '../access/access-snapshot.service';

const router = Router();

router.get('/full', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const contract = await buildFrontendAccessContract(userId, tenantId);
  res.json({ data: contract });
}));

router.get('/minimal', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const contract = await getMinimalAccessContract(userId, tenantId);
  res.json({ data: contract });
}));

router.get('/navigation', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const contract = await getNavigationContract(userId, tenantId);
  res.json({ data: contract });
}));

// /api/authz/permissions — returns AuthzData flat shape consumed by frontend AuthzClientService
// Expected shape: { accessProfiles, permissions, scopes, functionalRoles }
router.get('/permissions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const snapshot = await getAccessSnapshot(tenantId, userId);
  // Return flat AuthzData shape as expected by frontend AuthzClientService (no { data: } wrapper)
  res.json({
    accessProfiles: snapshot.accessProfiles ?? [],
    permissions: snapshot.effectivePermissions ?? [],
    scopes: snapshot.scopeBindings?.map(s => `${s.scopeType}:${s.scopeId}`) ?? [],
    functionalRoles: snapshot.functionalRoles ?? [],
  });
}));

// /api/authz/contract/permissions — internal: returns PermissionContract in { data: } wrapper
router.get('/contract/permissions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const contract = await getPermissionContract(userId, tenantId);
  res.json({ data: contract });
}));

router.get('/version', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const version = await getContractVersion(userId, tenantId);
  res.json({ data: { version } });
}));

export default router;
