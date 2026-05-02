/**
 * Sectors REST router (W52a) — sub-router on `/api/compliance`.
 *
 *   GET    /sectors          list (status, search)
 *   GET    /sectors/:id      single
 *   POST   /sectors          create
 *   DELETE /sectors/:id      remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listSectors, getSector, createSector, deleteSector,
  type SectorStatus,
} from '../../application/sectors/sectors.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface SectorsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface SectorsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => SectorsRouterContext | Promise<SectorsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: SectorsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createSectorsRouter(deps: SectorsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_sectors_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/sectors', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sector.sector.read', res))) return;
    try {
      const out = await listSectors(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as SectorStatus : undefined,
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

  router.get('/sectors/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sector.sector.read', res))) return;
    try {
      const row = await getSector(deps.client, {
        tenantSchema: ctx.tenantSchema, sectorId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `sector ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/sectors', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sector.sector.write', res))) return;
    try {
      const created = await createSector(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        code: typeof req.body?.code === 'string' ? req.body.code : '',
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        description: typeof req.body?.description === 'string' ? req.body.description : undefined,
        status: typeof req.body?.status === 'string' ? req.body.status as SectorStatus : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'sector.create',
          resourceType: 'sector', resourceId: created.sectorId,
          after: { code: created.code, name: created.name, status: created.status },
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

  router.delete('/sectors/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sector.sector.write', res))) return;
    try {
      const before = await getSector(deps.client, {
        tenantSchema: ctx.tenantSchema, sectorId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `sector ${req.params.id} not found`);
      const removed = await deleteSector(deps.client, {
        tenantSchema: ctx.tenantSchema, sectorId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `sector ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'sector.delete',
          resourceType: 'sector', resourceId: removed.sectorId,
          before: { code: before.code, name: before.name },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(204).end();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'delete_failed', String(err.message));
    }
  });

  return router;
}
