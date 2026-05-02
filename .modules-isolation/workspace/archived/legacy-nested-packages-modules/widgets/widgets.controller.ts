import { Router, Request, Response } from 'express';
import { authenticate } from './ports/auth.port';
import { WidgetsService } from './widgets.service';
import { INSIGHT_WIDGET_KEYS } from './insight-widgets.service';

const router: import("express").Router = Router();
const service = new WidgetsService();

router.get('/widgets/:widgetKey', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Missing auth context' });
    }

    const widgetKey = String(req.params.widgetKey);

    const result = await service.getWidgetData({
      widgetKey,
      userId: String(userId),
      tenantId: String(tenantId),
    });

    // Insight widgets: frontend expects raw payload (e.g. {controls, insight})
    // Structural widgets: frontend expects the full WidgetResponseDto envelope
    if (INSIGHT_WIDGET_KEYS.has(widgetKey)) {
      return res.json(result.payload);
    }

    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load widget data';
    return res.status(500).json({ message });
  }
});

export default router;
