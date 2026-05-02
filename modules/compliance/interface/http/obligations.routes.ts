/**
 * Obligations REST router (W11) — mounts under the composite `/api/compliance`.
 *
 *   GET   /obligations              list (status, frameworkId, search, paging)
 *   GET   /obligations/:id          single
 *   POST  /obligations              create
 *   PATCH /obligations/:id/status   status transition
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listObligations, getObligation, createObligation, updateObligationStatus,
} from '../../application/obligations/obligations.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ObligationsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ObligationsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ObligationsRouterContext | Promise<ObligationsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: ObligationsRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createObligationsRouter(deps: ObligationsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_obligations_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/obligations', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance.read', res))) return;
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const out = await listObligations(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        status: status as never,
        frameworkId: typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
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

  router.get('/obligations/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance.read', res))) return;
    try {
      const row = await getObligation(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `obligation ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/obligations', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance.admin', res))) return;
    try {
      const created = await createObligation(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        frameworkId: typeof req.body?.frameworkId === 'string' ? req.body.frameworkId : null,
        obligationRef: typeof req.body?.obligationRef === 'string' ? req.body.obligationRef : '',
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        obligationType: typeof req.body?.obligationType === 'string' ? req.body.obligationType : undefined,
        frequency: typeof req.body?.frequency === 'string' ? req.body.frequency : null,
        dueDate: typeof req.body?.dueDate === 'string' ? req.body.dueDate : null,
        ownerId: typeof req.body?.ownerId === 'string' ? req.body.ownerId : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'obligation.create',
          resourceType: 'compliance_obligation', resourceId: created.id,
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

  router.patch('/obligations/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance.admin', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const before = await getObligation(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `obligation ${req.params.id} not found`);
      const updated = await updateObligationStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never,
      });
      if (!updated) return fail(res, 404, 'not_found', `obligation ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'obligation.status_change',
          resourceType: 'compliance_obligation', resourceId: updated.id,
          before: { status: before.status }, after: { status: updated.status },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'update_failed', String(err.message));
    }
  });

  return router;
}
