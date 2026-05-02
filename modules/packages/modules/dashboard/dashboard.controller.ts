import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { authenticate } from './ports/auth.port';
import { DashboardService } from './dashboard.service';

const router: import("express").Router = Router();
const service = new DashboardService();

router.get('/dashboard/resolve', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Missing auth context' });
    }

    const result = await service.resolveDefault({
      userId: String(userId),
      tenantId: String(tenantId),
    });

    return res.json(result);
  } catch (err: unknown) {
    return res.status(500).json({
      message: (err instanceof Error ? err.message : null) ?? 'Failed to resolve dashboard',
    });
  }
});

router.get('/dashboard/list', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Missing auth context' });
    }

    const result = await service.listAllowedDashboards({
      userId: String(userId),
      tenantId: String(tenantId),
    });

    return res.json(result);
  } catch (err: unknown) {
    return res.status(500).json({
      message: (err instanceof Error ? err.message : null) ?? 'Failed to list dashboards',
    });
  }
});

router.get('/dashboard/:dashboardCode', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Missing auth context' });
    }

    const result = await service.getDashboard({
      userId: String(userId),
      tenantId: String(tenantId),
      dashboardCode: req.params.dashboardCode || 'default',
    });

    return res.json(result);
  } catch (err: unknown) {
    const msg = (err instanceof Error ? err.message : null) ?? 'Failed to load dashboard';
    return res.status(
      msg.includes('not found') ? 404 : msg.includes('allowed') ? 403 : 500
    ).json({ message: msg });
  }
});

export default router;
