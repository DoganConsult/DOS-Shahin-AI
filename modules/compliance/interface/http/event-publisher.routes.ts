/**
 * Event-Publisher REST router (W60) — sub-router on `/api/compliance`.
 *
 *   GET    /event-publisher              list (status, eventType, aggregateId)
 *   GET    /event-publisher/:id          single
 *   POST   /event-publisher              publish event (status=pending)
 *   POST   /event-publisher/dispatch     drain pending batch
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listOutboxEvents, getOutboxEvent, publishEvent, dispatchPendingEvents,
  type OutboxStatus,
} from '../../application/event-publisher/event-publisher.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface EventPublisherRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface EventPublisherRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => EventPublisherRouterContext | Promise<EventPublisherRouterContext>;
  /** Optional handler invoked for each pending event during dispatch. */
  dispatchHandler?: (row: import('../../application/event-publisher/event-publisher.service').OutboxRow) => Promise<void> | void;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: EventPublisherRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createEventPublisherRouter(deps: EventPublisherRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('event_publisher_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/event-publisher', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.outbox.read', res))) return;
    try {
      const out = await listOutboxEvents(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as OutboxStatus : undefined,
        eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
        aggregateId: typeof req.query.aggregateId === 'string' ? req.query.aggregateId : undefined,
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

  router.get('/event-publisher/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.outbox.read', res))) return;
    try {
      const row = await getOutboxEvent(deps.client, {
        tenantSchema: ctx.tenantSchema, eventId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `event ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/event-publisher', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.outbox.write', res))) return;
    try {
      const created = await publishEvent(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        eventType: typeof req.body?.eventType === 'string' ? req.body.eventType : '',
        aggregateType: typeof req.body?.aggregateType === 'string' ? req.body.aggregateType : '',
        aggregateId: typeof req.body?.aggregateId === 'string' ? req.body.aggregateId : '',
        payload: req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'event.publish',
          resourceType: 'event_outbox', resourceId: created.eventId,
          after: {
            eventType: created.eventType,
            aggregateType: created.aggregateType,
            aggregateId: created.aggregateId,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'publish_failed', String(err.message));
    }
  });

  router.post('/event-publisher/dispatch', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.outbox.write', res))) return;
    try {
      const result = await dispatchPendingEvents(deps.client, {
        tenantSchema: ctx.tenantSchema,
        batch: req.body?.batch ? Number(req.body.batch) : undefined,
        handler: deps.dispatchHandler,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'event.dispatch',
          resourceType: 'event_outbox', resourceId: ctx.tenantSchema,
          after: { dispatched: result.dispatched, failed: result.failed },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'dispatch_failed', String(err.message));
    }
  });

  return router;
}
