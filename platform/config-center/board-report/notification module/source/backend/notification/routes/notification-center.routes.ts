import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
import type { GenericRow } from '@dos/types';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow, getFirstRowOrThrow } from '@dos/db';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, fieldRbacFilter, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { updatePreferencesBody } from "../schemas/notification.schemas";

const router = Router();
router.use(moduleStack('notification'));
router.use(auditMiddleware("notification"));
router.use(automationMiddleware("notification"));
router.use(fieldRbacFilter("notification"));

router.get("/", authenticate, requirePermission('notification.config.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  const result = await safeQuery(
  `SELECT * FROM "${schema}".notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
  [userId]
  );
  const unread = result.rows.filter((n: GenericRow) => !n.read_at).length;
  res.json({ notifications: result.rows, unread, total: result.rows.length });
}));

router.get("/preferences", authenticate, requirePermission('notification.config.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  const result = await safeQuery(`SELECT * FROM "${schema}".notification_preferences WHERE user_id = $1`, [userId]);
  res.json(getFirstRow(result) || { email: true, push: true, in_app: true });
}));

router.put("/preferences", authenticate, requirePermission('notification.config.write'), validate({ body: updatePreferencesBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  const { email, push, in_app } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".notification_preferences (user_id, email, push, in_app) VALUES ($1,$2,$3,$4)
  ON CONFLICT (user_id) DO UPDATE SET email=$2, push=$3, in_app=$4 RETURNING *`,
  [userId, email ?? true, push ?? true, in_app ?? true]
  );
  const prefs = getFirstRowOrThrow(result, 'Notification preferences update failed');
  setAuditData(res as any, { action: "update", entityType: "notification", entityId: userId, afterState: prefs });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'updated', entityType: 'notification_center', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.notification_center.updated' });
  res.json(prefs);
}));

export default router;

