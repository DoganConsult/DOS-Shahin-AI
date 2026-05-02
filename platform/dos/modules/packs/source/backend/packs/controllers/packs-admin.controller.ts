import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function getPacksAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/pack-admin.service.js');
  const result = await svc.getConfig(req.tenantId!);
  res.json(ok(result, req));
}

export async function updatePacksAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/pack-admin.service.js');
  const result = await svc.updateConfig(req.tenantId!, req.body, req.userId!);
  res.json(ok(result, req));
}
