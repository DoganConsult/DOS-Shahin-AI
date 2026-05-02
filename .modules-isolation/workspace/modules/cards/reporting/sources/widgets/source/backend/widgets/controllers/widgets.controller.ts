import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function listWidgets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc: Record<string, unknown> = await import('../services/widgets.service.js');

  const result = await svc.list(req.tenantId, req.query);
  res.json(ok(result, req));
}

export async function getWidgetsById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc: Record<string, unknown> = await import('../services/widgets.service.js');

  const result = await svc.getById(req.tenantId, req.params.id);
  res.json(ok(result, req));
}

export async function createWidgets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc: Record<string, unknown> = await import('../services/widgets.service.js');

  const result = await svc.create(req.tenantId, req.body, req.user?.userId);
  res.status(201).json(ok(result, req));
}

export async function updateWidgets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc: Record<string, unknown> = await import('../services/widgets.service.js');

  const result = await svc.update(req.tenantId, req.params.id, req.body, req.user?.userId);
  res.json(ok(result, req));
}
