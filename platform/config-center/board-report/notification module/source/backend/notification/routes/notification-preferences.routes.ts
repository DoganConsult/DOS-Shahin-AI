import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { safeQuery, query as _query } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { updateRootBody } from "../schemas/notification.schemas";

const router = Router();
router.use(moduleStack('notification'));
router.use(auditMiddleware('notification'));

// GET /api/notification-preferences — Get current user's notification preferences
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('notification.config.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId || req.userId!;

    const result = await safeQuery(
      `SELECT activity_type AS "activityType", in_app AS "inApp", email
       FROM notification_preferences
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY activity_type`,
      [tenantId, userId]
    );

    res.json({ data: result.rows });
  } catch {
    res.json({ data: [] });
  }
});

// PUT /api/notification-preferences — Upsert a single notification preference
router.put("/", authenticate, requirePermission('notification.config.write'), validate({ body: updateRootBody }), async (req: Request, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId || req.userId!;
    const { activityType, inApp, email } = req.body;

    if (!activityType) {
      res.status(400).json({ error: "activityType required" });
      return;
    }

    await safeQuery(
      `INSERT INTO notification_preferences (tenant_id, user_id, activity_type, in_app, email, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id, user_id, activity_type)
       DO UPDATE SET in_app = EXCLUDED.in_app, email = EXCLUDED.email, updated_at = NOW()`,
      [tenantId, userId, activityType, inApp ?? true, email ?? false]
    );

    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'updated', entityType: 'notification_preferences', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.notification_preferences.updated' });
    res.json({ success: true });

});

export default router;

