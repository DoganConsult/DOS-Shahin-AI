import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function listRegulatoryChanges(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-regulatory-change-tracking.service.js');
  const result = await svc.getRegulatoryChangeHistory(req.tenantId!, req.query as Record<string, string | undefined>);
  res.json(ok(result, req));
}

export async function getRegulatoryObligations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-obligation.service.js');
  const result = await svc.listKsaObligations(req.tenantId!, req.query as Record<string, string | undefined>);
  res.json(ok(result, req));
}

export async function getComplianceScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-compliance-scoring.service.js');
  const result = await svc.getComplianceScore(req.tenantId!);
  res.json(ok(result, req));
}

export async function getSectorMaturity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-sector-maturity.service.js');
  const result = await svc.assessMaturity(req.tenantId!);
  res.json(ok(result, req));
}

export async function getCrossFrameworkMapping(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-cross-framework-mapping.service.js');
  const result = await svc.getMappings(req.tenantId!, req.query);
  res.json(ok(result, req));
}

export async function getReadinessSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/ksa-readiness.service.js');
  const result = await svc.getKsaReadinessSummary(req.tenantId!);
  res.json(ok(result, req));
}
