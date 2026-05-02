/**
 * Versions REST router (W34) — sub-router on composite `/api/compliance`.
 *
 *   GET  /versions                      list (entityType, entityId, changedBy, paging)
 *   GET  /versions/:id                  single
 *   GET  /versions/latest/:entityType/:entityId   latest snapshot for entity
 *   POST /versions                      record new immutable snapshot (auto-increment version)
 *
 * Append-only: no PATCH/DELETE (audit-grade immutability).
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listVersions, getVersion, getLatestVersion, recordVersion,
} from '../../application/versions/versions.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface VersionsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface VersionsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => VersionsRouterContext | Promise<VersionsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: VersionsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createVersionsRouter(deps: VersionsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_versions_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/versions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'version.snapshot.read', res))) return;
    try {
      const out = await listVersions(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        changedBy: typeof req.query.changedBy === 'string' ? req.query.changedBy : undefined,
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

  router.get('/versions/latest/:entityType/:entityId', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'version.snapshot.read', res))) return;
    try {
      const row = await getLatestVersion(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        entityType: req.params.entityType, entityId: req.params.entityId,
      });
      if (!row) return fail(res, 404, 'not_found',
        `no version for ${req.params.entityType}/${req.params.entityId}`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.get('/versions/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'version.snapshot.read', res))) return;
    try {
      const row = await getVersion(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `version ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/versions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'version.snapshot.write', res))) return;
    try {
      const created = await recordVersion(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType : '',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : '',
        data: typeof req.body?.data === 'object' && req.body.data ? req.body.data : {},
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'version.record',
          resourceType: 'compliance_version', resourceId: created.id,
          after: { entityType: created.entityType, entityId: created.entityId, version: created.version },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  return router;
}
