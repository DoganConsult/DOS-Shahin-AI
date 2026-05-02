import { emitEvent as _emitEvent } from './ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { authenticate } from './ports/auth.port';
import { DashboardEditorService } from './dashboard-editor.service';
import { auditMiddleware, setAuditData } from './ports/middleware.port';

const router: import("express").Router = Router();
router.use(auditMiddleware('dashboard'));
const service = new DashboardEditorService();

router.get('/dashboard/:dashboardCode/widgets', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Missing tenant context' });
    }

    const result = await service.listAvailableWidgets(String(tenantId));
    return res.json(result);
  } catch (err: unknown) {
    return res.status(500).json({ message: (err instanceof Error ? err.message : null) ?? 'Failed to list widgets' });
  }
});

router.put('/dashboard/:dashboardCode/layout', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Missing auth context' });
    }

    const result = await service.saveLayout(
      {
        userId: String(userId),
        tenantId: String(tenantId),
        dashboardCode: String(req.params.dashboardCode),
      },
      req.body
    );

    setAuditData(res as any, { action: 'update_layout', entityType: 'dashboard_layout', entityId: req.params.dashboardCode });
    return res.json(result);
  } catch (err: unknown) {
    return res.status(400).json({ message: (err instanceof Error ? err.message : null) ?? 'Failed to save layout' });
  }
});

router.delete('/dashboard/:dashboardCode/layout-override', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Missing auth context' });
    }

    const appliesToRole =
      typeof req.query.appliesToRole === 'string' ? req.query.appliesToRole : null;

    const result = await service.resetLayout(
      {
        userId: String(userId),
        tenantId: String(tenantId),
        dashboardCode: String(req.params.dashboardCode),
      },
      appliesToRole
    );

    setAuditData(res as any, { action: 'reset_layout', entityType: 'dashboard_layout', entityId: req.params.dashboardCode });
    return res.json(result);
  } catch (err: unknown) {
    return res.status(400).json({ message: (err instanceof Error ? err.message : null) ?? 'Failed to reset layout' });
  }
});

export default router;
