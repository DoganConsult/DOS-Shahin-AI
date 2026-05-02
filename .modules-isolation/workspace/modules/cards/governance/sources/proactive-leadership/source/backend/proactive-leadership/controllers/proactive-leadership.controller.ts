import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function getExecutiveBrief(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/executive-brief.service.js');
  const result = await svc.generateBrief(req.tenantId!, req.user?.userId);
  res.json(ok(result, req));
}

export async function getStrategicInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/strategic-insights.service.js');
  const result = await svc.getInsights(req.tenantId!, req.query);
  res.json(ok(result, req));
}

export async function getLeadershipAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/leadership-alerts.service.js');
  const result = await svc.getAlerts(req.tenantId!, req.query);
  res.json(ok(result, req));
}

export async function getRiskIntelligence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/risk-intelligence.service.js');
  const result = await svc.getRiskIntelligence(req.tenantId!);
  res.json(ok(result, req));
}
