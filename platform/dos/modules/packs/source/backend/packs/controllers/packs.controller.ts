import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function listPacks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/pack-registry.service.js');

  const result = await svc.listPacks(req.tenantId, req.query);
  res.json(ok(result, req));
}

export async function getPackById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/pack-registry.service.js');

  const result = await svc.getPackById(req.tenantId, req.params.id);
  res.json(ok(result, req));
}

export async function installPack(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/pack-installation.service.js');
  const result = await svc.installPack(req.tenantId!, req.body, req.user?.userId);
  res.status(201).json(ok(result, req));
}

export async function uninstallPack(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/pack-installation.service.js');
  const result = await svc.uninstallPack(req.tenantId!, req.params.id, req.user?.userId);
  res.json(ok(result, req));
}

export async function checkCompatibility(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/pack-compatibility.service.js');
  const result = await svc.checkCompatibility(req.tenantId!, req.params.packCode);
  res.json(ok(result, req));
}
