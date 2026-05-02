/**
 * Notification-Dispatcher REST router (W69) — sub-router on `/api/compliance`.
 *
 *   GET  /notification-dispatcher           list notifications (filters)
 *   GET  /notification-dispatcher/:id       fetch one
 *   POST /notification-dispatcher           enqueue a queued notification
 *   POST /notification-dispatcher/dispatch  drain queued (handler optional)
 *   POST /notification-dispatcher/:id/cancel cancel a queued|failed notification
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  enqueueNotification, listNotifications, getNotification,
  cancelNotification, dispatchQueued,
  type NotificationChannel, type NotificationStatus, type NotificationRow,
} from '../../application/notification-dispatcher/notification-dispatcher.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface NotificationDispatcherRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface NotificationDispatcherRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => NotificationDispatcherRouterContext | Promise<NotificationDispatcherRouterContext>;
  /** Optional default channel handler used by POST /dispatch when no handler is wired by host. */
  handler?: (row: NotificationRow) => Promise<void> | void;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: NotificationDispatcherRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createNotificationDispatcherRouter(
  deps: NotificationDispatcherRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('notification_dispatcher_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/notification-dispatcher', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'notification.read', res))) return;
    try {
      const out = await listNotifications(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as NotificationStatus : undefined,
        channel: typeof req.query.channel === 'string' ? req.query.channel as NotificationChannel : undefined,
        recipientUserId: typeof req.query.recipientUserId === 'string' ? req.query.recipientUserId : undefined,
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

  router.get('/notification-dispatcher/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'notification.read', res))) return;
    try {
      const r = await getNotification(deps.client, {
        tenantSchema: ctx.tenantSchema, notificationId: req.params.id,
      });
      if (!r) return fail(res, 404, 'not_found', `notification ${req.params.id} not found`);
      res.json({ data: r });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/notification-dispatcher', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'notification.write', res))) return;
    try {
      const row = await enqueueNotification(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        recipientUserId: String(req.body?.recipientUserId ?? ''),
        channel: req.body?.channel as NotificationChannel,
        subject: String(req.body?.subject ?? ''),
        body: String(req.body?.body ?? ''),
        payload: req.body?.payload ?? {},
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'notification.enqueue',
          resourceType: 'notification', resourceId: row.notificationId,
          after: { channel: row.channel, recipientUserId: row.recipientUserId },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_channel') return fail(res, 400, 'bad_channel', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'enqueue_failed', String(err.message));
    }
  });

  router.post('/notification-dispatcher/dispatch', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'notification.write', res))) return;
    try {
      const batch = req.body?.batch ? Number(req.body.batch) : undefined;
      const result = await dispatchQueued(deps.client, {
        tenantSchema: ctx.tenantSchema, batch, handler: deps.handler,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'notification.dispatch',
          resourceType: 'notification_dispatch', resourceId: ctx.tenantSchema,
          after: { scanned: result.scanned, sent: result.sent, failed: result.failed },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'dispatch_failed', String(err.message));
    }
  });

  router.post('/notification-dispatcher/:id/cancel', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'notification.write', res))) return;
    try {
      const row = await cancelNotification(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        notificationId: req.params.id,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'notification.cancel',
          resourceType: 'notification', resourceId: row.notificationId,
          after: { status: row.status },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_state') return fail(res, 409, 'bad_state', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'cancel_failed', String(err.message));
    }
  });

  return router;
}
