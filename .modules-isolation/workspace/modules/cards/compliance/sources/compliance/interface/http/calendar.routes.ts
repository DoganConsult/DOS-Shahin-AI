/**
 * Calendar REST router (W22) — sub-router on composite `/api/compliance`.
 *
 *   GET   /calendar                list (eventType, frameworkId, status, fromDate, toDate, paging)
 *   GET   /calendar/:id            single
 *   POST  /calendar                create
 *   PATCH /calendar/:id/status     transition status
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listCalendar, getCalendar,
  createCalendar, updateCalendarStatus,
} from '../../application/calendar/calendar.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface CalendarRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface CalendarRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => CalendarRouterContext | Promise<CalendarRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: CalendarRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createCalendarRouter(deps: CalendarRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_calendar_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/calendar', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'calendar.event.read', res))) return;
    try {
      const out = await listCalendar(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
        frameworkId: typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        fromDate: typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined,
        toDate: typeof req.query.toDate === 'string' ? req.query.toDate : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/calendar/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'calendar.event.read', res))) return;
    try {
      const row = await getCalendar(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `calendar ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/calendar', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'calendar.event.write', res))) return;
    try {
      const created = await createCalendar(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        eventType: typeof req.body?.eventType === 'string' ? req.body.eventType : '',
        startDate: typeof req.body?.startDate === 'string' ? req.body.startDate : '',
        endDate: typeof req.body?.endDate === 'string' ? req.body.endDate : null,
        frameworkId: typeof req.body?.frameworkId === 'string' ? req.body.frameworkId : null,
        recurrence: typeof req.body?.recurrence === 'string' ? req.body.recurrence : null,
        ownerId: typeof req.body?.ownerId === 'string' ? req.body.ownerId : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
        reminders: Array.isArray(req.body?.reminders) ? req.body.reminders : [],
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'calendar.create',
          resourceType: 'compliance_calendar', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/calendar/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'calendar.event.write', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const before = await getCalendar(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `calendar ${req.params.id} not found`);
      const updated = await updateCalendarStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never,
      });
      if (!updated) return fail(res, 404, 'not_found', `calendar ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'calendar.status_change',
          resourceType: 'compliance_calendar', resourceId: updated.id,
          before: { status: before.status },
          after: { status: updated.status },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'status_change_failed', String(err.message));
    }
  });

  return router;
}
