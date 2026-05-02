/**
 * Authz Explain Routes — returns the current user's effective permissions
 * via DAuth's canonical AccessSnapshot service.
 *
 * Law 2: Permission resolution belongs to DAuth.
 * Law 4: No frontend-invented truth — backend is source of permission truth.
 */
import { Router } from 'express';
import { asyncHandler } from '@dos/platform-core/http';
import { authenticate } from '..';
import { toErrorMessage } from '@dos/types/errors';
import { accessSnapshotService } from '../access/access-snapshot.service';

const router = Router();

router.get('/check', authenticate, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user?.userId || req.user?.id;

  if (!tenantId || !userId) {
    res.status(400).json({ error: 'Missing tenantId or userId in auth context' });
    return;
  }

  try {
    const snapshot = await accessSnapshotService.getUserAuthzPayload(tenantId, userId);
    res.json({
      userId,
      tenantId,
      permissions: snapshot?.effectivePermissions ?? [],
      roles: snapshot?.functionalRoles ?? [],
      accessProfiles: snapshot?.accessProfiles ?? [],
      decisionAuthorities: snapshot?.decisionAuthorities ?? [],
      allowedModules: snapshot?.allowedModules ?? [],
    });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
}));

export default router;
