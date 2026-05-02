import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function getWidgetsAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const mod: Record<string, unknown> = await import('../admin/widgets-admin.routes.js').catch(() => ({}));

  const config = await mod.getConfig?.(req.tenantId) ?? {};
  res.json(ok(config, req));
}

export async function updateWidgetsAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const mod: Record<string, unknown> = await import('../admin/widgets-admin.routes.js').catch(() => ({}));

  const result = await mod.updateConfig?.(req.tenantId, req.body) ?? {};
  res.json(ok(result, req));
}
