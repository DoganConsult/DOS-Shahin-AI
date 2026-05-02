import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate } from '../ports/auth.port';
import {
  registerWebhook, listWebhooks, deleteWebhook, getWebhookDeliveryLog,
} from '../ports/platform.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, asyncHandler, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createRootBody } from "../schemas/integrations.schemas";

const router = Router();
router.use(moduleStack('integrations'));
router.use(auditMiddleware('integrations'));

/**
 * @openapi
 * /webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: List all webhook subscriptions for the tenant
 *   post:
 *     tags: [Webhooks]
 *     summary: Register a new outbound webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url, events, secret]
 *             properties:
 *               url: { type: string, format: uri }
 *               events: { type: array, items: { type: string } }
 *               secret: { type: string, description: 'HMAC signing secret' }
 *               description: { type: string }
 */
router.get('/', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await listWebhooks(tenantId);
  res.json({ data });
}));

router.post('/', authenticate, validate({ body: createRootBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { url, events, secret, description } = req.body;
  if (!url || !events?.length || !secret) {
  return res.status(400).json({ error: 'url, events, and secret are required' }) as unknown;
  }

  const webhookId = await registerWebhook(tenantId, { url, events, secret, description });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'webhook_outbound', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.webhook_outbound.created' });
  res.status(201).json({ webhookId });
}));

/**
 * @openapi
 * /webhooks/{webhookId}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Deactivate a webhook subscription
 */
router.delete('/:webhookId', authenticate, validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await deleteWebhook(tenantId, req.params.webhookId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'deleted', entityType: 'webhook_outbound', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.webhook_outbound.deleted' });
  res.json({ success: true });
}));

/**
 * @openapi
 * /webhooks/{webhookId}/deliveries:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get delivery log for a webhook
 */
router.get('/:webhookId/deliveries', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getWebhookDeliveryLog(tenantId, req.params.webhookId);
  res.json({ data });
}));

export default router;

