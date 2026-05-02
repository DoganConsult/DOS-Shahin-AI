/**
 * Controls REST router — first real per-page wiring (W9).
 *
 *   GET  /api/controls            list (filterable by status, paged)
 *   GET  /api/controls/:id        single
 *   POST /api/controls            create
 *
 * Mounted directly on its routeBase via `routers['/api/controls']` override
 * (NOT through the composite `/api/compliance` router) so the existing
 * aggregator mount table flips that prefix to `wired=true`.
 *
 * Permission keys are checked through the host-supplied `hasPermission` hook;
 * audits are written through the bound Audit port.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import { listControls, getControl, createControl } from '../../application/controls/controls.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ControlsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ControlsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ControlsRouterContext | Promise<ControlsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: ControlsRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true; // host opted out of gating at this layer
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createControlsRouter(deps: ControlsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_controls_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance.read', res))) return;
    try {
      const out = await listControls(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
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

  router.get('/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance.read', res))) return;
    try {
      const row = await getControl(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance.admin', res))) return;
    try {
      const created = await createControl(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        status: typeof req.body?.status === 'string' ? req.body.status : undefined,
        metadata: typeof req.body?.metadata === 'object' && req.body.metadata !== null ? req.body.metadata : {},
      });
      // best-effort audit (never blocks the response)
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control.create',
          resourceType: 'compliance_control', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit not bound is acceptable in dev */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  return router;
}
