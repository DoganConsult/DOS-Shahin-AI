import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function getAgrcEngineAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const mod = await import('../admin/agrc-engine-admin.routes').catch(() => ({} as any)) as any;

  const config = (typeof mod.getConfig === 'function' ? await mod.getConfig(req.tenantId) : {}) ?? {};
  res.json(ok(config, req));
}

export async function updateAgrcEngineAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const mod = await import('../admin/agrc-engine-admin.routes').catch(() => ({} as any)) as any;

  const result = (typeof mod.updateConfig === 'function' ? await mod.updateConfig(req.tenantId, req.body) : {}) ?? {};
  res.json(ok(result, req));
}
