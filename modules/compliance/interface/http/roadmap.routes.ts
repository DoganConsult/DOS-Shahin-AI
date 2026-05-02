/**
 * Roadmap REST router (W21) — sub-router on composite `/api/compliance`.
 *
 *   GET   /roadmap                list (milestoneType, status, ownerId, paging)
 *   GET   /roadmap/:id            single
 *   POST  /roadmap                create
 *   PATCH /roadmap/:id/status     transition status (auto-stamps actual_date on completed)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listRoadmap, getRoadmap,
  createRoadmap, updateRoadmapStatus,
} from '../../application/roadmap/roadmap.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface RoadmapRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface RoadmapRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RoadmapRouterContext | Promise<RoadmapRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: RoadmapRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createRoadmapRouter(deps: RoadmapRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_roadmap_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/roadmap', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'roadmap.milestone.read', res))) return;
    try {
      const out = await listRoadmap(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        milestoneType: typeof req.query.milestoneType === 'string' ? req.query.milestoneType : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        ownerId: typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined,
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

  router.get('/roadmap/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'roadmap.milestone.read', res))) return;
    try {
      const row = await getRoadmap(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `roadmap ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/roadmap', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'roadmap.milestone.write', res))) return;
    try {
      const created = await createRoadmap(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        milestoneType: typeof req.body?.milestoneType === 'string' ? req.body.milestoneType : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        targetDate: typeof req.body?.targetDate === 'string' ? req.body.targetDate : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
        dependencies: Array.isArray(req.body?.dependencies) ? req.body.dependencies : [],
        ownerId: typeof req.body?.ownerId === 'string' ? req.body.ownerId : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'roadmap.create',
          resourceType: 'compliance_roadmap', resourceId: created.id,
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

  router.patch('/roadmap/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'roadmap.milestone.write', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const actualDate = typeof req.body?.actualDate === 'string' ? req.body.actualDate : null;
      const before = await getRoadmap(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `roadmap ${req.params.id} not found`);
      const updated = await updateRoadmapStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never, actualDate,
      });
      if (!updated) return fail(res, 404, 'not_found', `roadmap ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'roadmap.status_change',
          resourceType: 'compliance_roadmap', resourceId: updated.id,
          before: { status: before.status, actualDate: before.actualDate },
          after: { status: updated.status, actualDate: updated.actualDate },
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
