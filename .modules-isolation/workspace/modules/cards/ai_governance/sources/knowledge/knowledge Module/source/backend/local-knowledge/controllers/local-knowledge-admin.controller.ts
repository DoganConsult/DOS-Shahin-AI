import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function getKnowledgeAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/misc/knowledge-admin.service.js');
  const result = await svc.getConfig(req.tenantId!);
  res.json(ok(result, req));
}

export async function updateKnowledgeAdminConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/misc/knowledge-admin.service.js');
  const result = await svc.updateConfig(req.tenantId!, req.body);
  res.json(ok(result, req));
}

export async function triggerReindex(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/local/embedding-pipeline.service.js');
  const result = await svc.triggerReindex(req.tenantId!);
  res.json(ok(result, req));
}
