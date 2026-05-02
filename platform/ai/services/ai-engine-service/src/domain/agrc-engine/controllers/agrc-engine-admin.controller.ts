import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function getAgrcEngineAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const mod: Record<string, unknown> = await import('../admin/agrc-engine-admin.routes').catch(() => ({}));

  const config = await mod.getConfig?.(req.tenantId) ?? {};
  res.json(ok(config, req));
}

export async function updateAgrcEngineAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const mod: Record<string, unknown> = await import('../admin/agrc-engine-admin.routes').catch(() => ({}));

  const result = await mod.updateConfig?.(req.tenantId, req.body) ?? {};
  res.json(ok(result, req));
}
