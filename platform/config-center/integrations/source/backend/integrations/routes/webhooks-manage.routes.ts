import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Integrations — Webhook Endpoint Management Routes
// CRUD + test-ping for tenant webhook subscriptions.
// Mounted at /api/webhooks-manage
// ============================================


import crypto from 'crypto';
import { authenticate, requirePermission } from '../ports/auth.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, asyncHandler, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createWebhookBody, createTestBody } from "../schemas/integrations.schemas";

// ── Zod Validation Schemas ──────────────────────────────────────────────
const router = Router();
router.use(moduleStack('integrations'));
router.use(auditMiddleware('integrations'));

/**
 * GET / — List all webhook endpoints for the tenant.
 * Returns active (non-deleted) endpoints ordered by creation date.
 */
router.get('/', authenticate, requirePermission('admin.system.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT webhook_id, url, event_types, secret_masked, active,
            created_at, last_triggered_at, failure_count
       FROM "${schema}".webhook_endpoints
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
    [],
  );
  res.json({ webhooks: result.rows });
}));

/**
 * POST / — Create a new webhook endpoint.
 * Body: { url: string; event_types: string[]; secret?: string }
 */
router.post('/', authenticate, requirePermission('admin.system.write'), validate({ body: createWebhookBody }), asyncHandler(async (req: Request, res: Response) => {
  const { url, event_types, secret } = req.body;
  const schema = tenantSchema(req.tenantId!);
  const id = crypto.randomUUID();
  const secretHash = secret
    ? crypto.createHash('sha256').update(secret).digest('hex')
    : null;
  const secretMasked = secret ? `***${secret.slice(-4)}` : null;

  await safeQuery(
    `INSERT INTO "${schema}".webhook_endpoints
       (webhook_id, url, event_types, secret_hash, secret_masked, active, created_by)
     VALUES ($1, $2, $3, $4, $5, true, $6)`,
    [id, url, JSON.stringify(event_types), secretHash, secretMasked, req.userId!],
  );

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!,
      userId: req.user!.userId!,
      module: 'integrations',
      event: 'created',
      entityType: 'webhook_endpoint',
      entityId: id,
    } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:integrations.webhook_endpoint.created' });

  res.status(201).json({ webhook_id: id });
}));

/**
 * DELETE /:id — Soft-delete a webhook endpoint.
 */
router.delete('/:id', authenticate, requirePermission('admin.system.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(
    `UPDATE "${schema}".webhook_endpoints SET deleted_at = NOW() WHERE webhook_id = $1`,
    [req.params.id],
  );

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!,
      userId: req.user!.userId!,
      module: 'integrations',
      event: 'deleted',
      entityType: 'webhook_endpoint',
      entityId: req.params.id,
    } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:integrations.webhook_endpoint.deleted' });

  res.json({ deleted: true });
}));

/**
 * POST /:id/test — Send a test ping to the webhook endpoint.
 * Returns { success, status } on reachable target or { success: false, error } on failure.
 */
router.post('/:id/test', authenticate, requirePermission('admin.system.write'), validate({ body: createTestBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT url, secret_hash
       FROM "${schema}".webhook_endpoints
      WHERE webhook_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }

  const { url } = result.rows[0];
  const testPayload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    tenant_id: req.tenantId,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10_000),
    });
    res.json({ success: response.ok, status: response.status });
  } catch {
    res.json({ success: false, error: 'Connection failed' });
  }
}));

export default router;

