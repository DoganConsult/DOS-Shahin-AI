import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function listAgrcEngine(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await import('../services/agrc-engine.service').then((s) => s.list(req.tenantId, req.query));
  res.json(ok(result, req));
}

export async function getAgrcEngineById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await import('../services/agrc-engine.service').then((s) => s.getById(req.tenantId, req.params.id));
  res.json(ok(result, req));
}

export async function createAgrcEngine(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await import('../services/agrc-engine.service').then((s) => s.create(req.tenantId, req.body, req.user?.userId));
  res.status(201).json(ok(result, req));
}

export async function updateAgrcEngine(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await import('../services/agrc-engine.service').then((s) => s.update(req.tenantId, req.params.id, req.body, req.user?.userId));
  res.json(ok(result, req));
}
