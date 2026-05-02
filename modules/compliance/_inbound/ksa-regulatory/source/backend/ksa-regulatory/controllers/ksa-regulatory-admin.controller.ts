import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function getKsaAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-admin.service.js');
  const result = await svc.getKsaAdminConfig(req.tenantId!);
  res.json(ok(result, req));
}

export async function updateKsaAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-admin.service.js');
  const result = await svc.updateKsaAdminConfig(req.tenantId!, req.body);
  res.json(ok(result, req));
}

export async function getJurisdictionRegistry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/jurisdiction-registry.service.js');
  const result = await svc.listJurisdictions(req.tenantId!);
  res.json(ok(result, req));
}
