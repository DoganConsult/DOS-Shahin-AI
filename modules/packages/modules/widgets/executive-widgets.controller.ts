import { Router, Request, Response } from 'express';
import { authenticate } from './ports/auth.port';
import { ExecutiveWidgetsService } from './executive-widgets.service';

const router: import("express").Router = Router();

function resolveTenantId(req: Request): string | null {
  return (
    (req.user?.tenantId as string) ||
    (req.query?.tenantId as string) ||
    (req.headers['x-tenant-id'] as string) ||
    null
  );
}

router.get('/widgets/executive/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }
    const result = await new ExecutiveWidgetsService().getSummary(tenantId);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load executive summary widget';
    return res.status(400).json({ message });
  }
});

router.get('/widgets/executive/top-breached-kris', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const limit = Number(req.query?.limit ?? 10);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }
    const result = await new ExecutiveWidgetsService().getTopBreachedKris(tenantId, limit);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load top breached KRIs widget';
    return res.status(400).json({ message });
  }
});

router.get('/widgets/executive/policy-review-debt', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const limit = Number(req.query?.limit ?? 10);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }
    const result = await new ExecutiveWidgetsService().getPolicyReviewDebt(tenantId, limit);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load policy review debt widget';
    return res.status(400).json({ message });
  }
});

router.get('/widgets/executive/engine-trend', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const limit = Number(req.query?.limit ?? 12);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }
    const result = await new ExecutiveWidgetsService().getEngineTrend(tenantId, limit);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load engine trend widget';
    return res.status(400).json({ message });
  }
});

export default router;
