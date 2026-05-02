/**
 * Framework-Sector-Applicability REST router (W52b) — sub-router on
 * `/api/compliance`.
 *
 *   GET    /framework-sector-applicability             list (frameworkCode, sectorId, applicability)
 *   GET    /framework-sector-applicability/:id         single
 *   POST   /framework-sector-applicability             create
 *   DELETE /framework-sector-applicability/:id         remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listFrameworkSectorApplicability,
  getFrameworkSectorApplicability,
  createFrameworkSectorApplicability,
  deleteFrameworkSectorApplicability,
  type Applicability,
} from '../../application/framework-sector-applicability/framework-sector-applicability.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface FrameworkSectorApplicabilityRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface FrameworkSectorApplicabilityRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => FrameworkSectorApplicabilityRouterContext | Promise<FrameworkSectorApplicabilityRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: FrameworkSectorApplicabilityRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createFrameworkSectorApplicabilityRouter(
  deps: FrameworkSectorApplicabilityRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_framework_sector_applicability_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/framework-sector-applicability', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'framework_sector.applicability.read', res))) return;
    try {
      const out = await listFrameworkSectorApplicability(deps.client, {
        tenantSchema: ctx.tenantSchema,
        frameworkCode: typeof req.query.frameworkCode === 'string' ? req.query.frameworkCode : undefined,
        sectorId: typeof req.query.sectorId === 'string' ? req.query.sectorId : undefined,
        applicability: typeof req.query.applicability === 'string' ? req.query.applicability as Applicability : undefined,
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

  router.get('/framework-sector-applicability/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'framework_sector.applicability.read', res))) return;
    try {
      const row = await getFrameworkSectorApplicability(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `applicability ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/framework-sector-applicability', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'framework_sector.applicability.write', res))) return;
    try {
      const created = await createFrameworkSectorApplicability(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        frameworkCode: typeof req.body?.frameworkCode === 'string' ? req.body.frameworkCode : '',
        sectorId: typeof req.body?.sectorId === 'string' ? req.body.sectorId : '',
        applicability: typeof req.body?.applicability === 'string' ? req.body.applicability as Applicability : undefined,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'framework_sector_applicability.create',
          resourceType: 'framework_sector_applicability', resourceId: created.id,
          after: {
            frameworkCode: created.frameworkCode, sectorId: created.sectorId,
            applicability: created.applicability,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_applicability') return fail(res, 400, 'bad_applicability', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.delete('/framework-sector-applicability/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'framework_sector.applicability.write', res))) return;
    try {
      const before = await getFrameworkSectorApplicability(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `applicability ${req.params.id} not found`);
      const removed = await deleteFrameworkSectorApplicability(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `applicability ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'framework_sector_applicability.delete',
          resourceType: 'framework_sector_applicability', resourceId: removed.id,
          before: { frameworkCode: before.frameworkCode, sectorId: before.sectorId },
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
