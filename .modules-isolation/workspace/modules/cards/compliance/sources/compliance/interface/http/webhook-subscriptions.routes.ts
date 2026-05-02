/**
 * Webhook-Subscriptions REST router (W75) — sub-router on `/api/compliance`.
 *
 *   GET    /webhook-subscriptions             list (status/eventType filters)
 *   GET    /webhook-subscriptions/:id         fetch one
 *   POST   /webhook-subscriptions             create active
 *   PATCH  /webhook-subscriptions/:id/status  active|paused|revoked
 *   POST   /webhook-subscriptions/dispatch    fan-out an event
 *   GET    /webhook-deliveries                list deliveries
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  createSubscription, getSubscription, listSubscriptions, changeStatus,
  dispatchEvent, listDeliveries,
  type SubscriptionStatus, type DeliveryStatus, type WebhookSubscriptionRow,
} from '../../application/webhook-subscriptions/webhook-subscriptions.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface WebhookSubscriptionsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
  /** Host-supplied delivery transport. */
  transport?: (sub: WebhookSubscriptionRow, payload: Record<string, unknown>) =>
    Promise<number | void> | number | void;
}

export interface WebhookSubscriptionsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => WebhookSubscriptionsRouterContext | Promise<WebhookSubscriptionsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: WebhookSubscriptionsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createWebhookSubscriptionsRouter(
  deps: WebhookSubscriptionsRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('webhook_subscriptions_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/webhook-subscriptions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'webhook.read', res))) return;
    try {
      const out = await listSubscriptions(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as SubscriptionStatus : undefined,
        eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/webhook-subscriptions/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'webhook.read', res))) return;
    try {
      const row = await getSubscription(deps.client, {
        tenantSchema: ctx.tenantSchema, subscriptionId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `subscription ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/webhook-subscriptions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'webhook.write', res))) return;
    try {
      const row = await createSubscription(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        targetUrl: String(req.body?.targetUrl ?? ''),
        eventTypes: Array.isArray(req.body?.eventTypes) ? req.body.eventTypes : [],
        secret: typeof req.body?.secret === 'string' ? req.body.secret : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'webhook.subscribe',
          resourceType: 'webhook_subscription', resourceId: row.subscriptionId,
          after: { targetUrl: row.targetUrl, eventTypes: row.eventTypes },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/webhook-subscriptions/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'webhook.write', res))) return;
    try {
      const row = await changeStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        subscriptionId: req.params.id,
        status: req.body?.status as SubscriptionStatus,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'webhook.status_change',
          resourceType: 'webhook_subscription', resourceId: row.subscriptionId,
          after: { status: row.status },
        });
      } catch { /* noop */ }
      res.status(200).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_state') return fail(res, 409, 'bad_state', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'status_change_failed', String(err.message));
    }
  });

  router.post('/webhook-subscriptions/dispatch', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'webhook.write', res))) return;
    try {
      const result = await dispatchEvent(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        eventType: String(req.body?.eventType ?? ''),
        payload: (req.body?.payload && typeof req.body.payload === 'object')
          ? req.body.payload : {},
        transport: ctx.transport,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'webhook.dispatch',
          resourceType: 'webhook_event', resourceId: String(req.body?.eventType ?? ''),
          after: {
            matched: result.matched, succeeded: result.succeeded,
            failed: result.failed,
          },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'dispatch_failed', String(err.message));
    }
  });

  router.get('/webhook-deliveries', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'webhook.read', res))) return;
    try {
      const out = await listDeliveries(deps.client, {
        tenantSchema: ctx.tenantSchema,
        subscriptionId: typeof req.query.subscriptionId === 'string' ? req.query.subscriptionId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as DeliveryStatus : undefined,
        eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      return fail(res, 500, 'list_deliveries_failed', String((e as Error).message));
    }
  });

  return router;
}
