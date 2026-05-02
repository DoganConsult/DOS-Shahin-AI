/**
 * Requirements REST router (W13) — mounts under composite `/api/compliance`.
 *
 *   GET  /requirements              list (frameworkId, criticality, isActive, search, paging)
 *   GET  /requirements/:id          single
 *   POST /requirements              create
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listRequirements, getRequirement, createRequirement,
} from '../../application/requirements/requirements.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface RequirementsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface RequirementsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RequirementsRouterContext | Promise<RequirementsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: RequirementsRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createRequirementsRouter(deps: RequirementsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_requirements_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/requirements', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'requirement.record.read', res))) return;
    try {
      const isActive = typeof req.query.isActive === 'string'
        ? req.query.isActive === 'true' : undefined;
      const out = await listRequirements(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        frameworkId: typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined,
        criticality: typeof req.query.criticality === 'string' ? (req.query.criticality as never) : undefined,
        isActive,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_criticality') return fail(res, 400, 'bad_criticality', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/requirements/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'requirement.record.read', res))) return;
    try {
      const row = await getRequirement(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `requirement ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/requirements', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'requirement.record.write', res))) return;
    try {
      const created = await createRequirement(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        frameworkId: typeof req.body?.frameworkId === 'string' ? req.body.frameworkId : '',
        refCode: typeof req.body?.refCode === 'string' ? req.body.refCode : '',
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        category: typeof req.body?.category === 'string' ? req.body.category : null,
        criticality: typeof req.body?.criticality === 'string' ? (req.body.criticality as never) : undefined,
        isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
        metadata: typeof req.body?.metadata === 'object' && req.body.metadata !== null ? req.body.metadata : {},
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'requirement.create',
          resourceType: 'compliance_requirement', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_criticality') return fail(res, 400, 'bad_criticality', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  return router;
}
