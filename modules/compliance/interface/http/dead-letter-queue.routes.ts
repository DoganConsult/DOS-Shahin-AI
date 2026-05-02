/**
 * Dead-Letter-Queue REST router (W67) — sub-router on `/api/compliance`.
 *
 *   GET    /dead-letter-queue              list (status/eventType/aggregateId)
 *   GET    /dead-letter-queue/:id          detail
 *   POST   /dead-letter-queue/from-event   move outbox event_id into DLQ
 *   POST   /dead-letter-queue/:id/replay   re-publish into outbox
 *   POST   /dead-letter-queue/:id/archive  mark archived (terminal)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listDlq, getDlq, moveToDlq, replayDlq, archiveDlq,
  type DlqStatus,
} from '../../application/dead-letter-queue/dead-letter-queue.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface DeadLetterQueueRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface DeadLetterQueueRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => DeadLetterQueueRouterContext | Promise<DeadLetterQueueRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: DeadLetterQueueRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createDeadLetterQueueRouter(deps: DeadLetterQueueRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('dead_letter_queue_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/dead-letter-queue', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.dlq.read', res))) return;
    try {
      const out = await listDlq(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as DlqStatus : undefined,
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

  router.get('/dead-letter-queue/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.dlq.read', res))) return;
    try {
      const row = await getDlq(deps.client, { tenantSchema: ctx.tenantSchema, dlqId: req.params.id });
      if (!row) return fail(res, 404, 'not_found', `dlq ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/dead-letter-queue/from-event', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.dlq.write', res))) return;
    try {
      const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId : '';
      if (!eventId) return fail(res, 400, 'bad_input', 'eventId required');
      const row = await moveToDlq(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId, eventId,
        errorMessage: typeof req.body?.errorMessage === 'string' ? req.body.errorMessage : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'event.dlq.move',
          resourceType: 'event_dead_letter', resourceId: row.dlqId,
          after: { eventId: row.eventId, eventType: row.eventType, status: row.status },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      return fail(res, 500, 'move_failed', String(err.message));
    }
  });

  router.post('/dead-letter-queue/:id/replay', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.dlq.write', res))) return;
    try {
      const row = await replayDlq(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId, dlqId: req.params.id,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'event.dlq.replay',
          resourceType: 'event_dead_letter', resourceId: row.dlqId,
          after: { newEventId: row.newEventId, status: row.status },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_state') return fail(res, 409, 'bad_state', err.message);
      return fail(res, 500, 'replay_failed', String(err.message));
    }
  });

  router.post('/dead-letter-queue/:id/archive', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.dlq.write', res))) return;
    try {
      const row = await archiveDlq(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId, dlqId: req.params.id,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'event.dlq.archive',
          resourceType: 'event_dead_letter', resourceId: row.dlqId,
          after: { status: row.status },
        });
      } catch { /* noop */ }
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      return fail(res, 500, 'archive_failed', String(err.message));
    }
  });

  return router;
}
