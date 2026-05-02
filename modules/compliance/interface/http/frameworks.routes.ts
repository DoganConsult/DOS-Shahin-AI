/**
 * Frameworks REST router — second per-page wiring (W10).
 *
 *   GET  /api/frameworks            list (filter by isActive, search)
 *   GET  /api/frameworks/:id        single
 *   POST /api/frameworks            create
 *
 * Mounted directly on its routeBase via `routers['/api/frameworks']` override
 * so the aggregator mount table flips that prefix to `wired=true`. Mirrors
 * the W9 controls vertical exactly: permission gate via host-supplied
 * `hasPermission`, audit on create, schema-injection guard.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import { listFrameworks, getFramework, createFramework } from '../../application/frameworks/frameworks.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface FrameworksRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface FrameworksRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => FrameworksRouterContext | Promise<FrameworksRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: FrameworksRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createFrameworksRouter(deps: FrameworksRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_frameworks_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'framework.record.read', res))) return;
    try {
      const isActive = typeof req.query.isActive === 'string'
        ? req.query.isActive === 'true'
        : undefined;
      const out = await listFrameworks(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        isActive,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
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
    if (!(await requirePerm(ctx, 'framework.record.read', res))) return;
    try {
      const row = await getFramework(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `framework ${req.params.id} not found`);
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
    if (!(await requirePerm(ctx, 'framework.record.write', res))) return;
    try {
      const created = await createFramework(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        code: typeof req.body?.code === 'string' ? req.body.code : '',
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        version: typeof req.body?.version === 'string' ? req.body.version : undefined,
        authority: typeof req.body?.authority === 'string' ? req.body.authority : undefined,
        isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
        metadata: typeof req.body?.metadata === 'object' && req.body.metadata !== null ? req.body.metadata : {},
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'framework.create',
          resourceType: 'compliance_framework', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit not bound is acceptable in dev */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'duplicate_code') return fail(res, 409, 'duplicate_code', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  return router;
}
