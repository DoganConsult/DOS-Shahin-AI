/**
 * Content-Pack Loader REST router (W58) — sub-router on `/api/compliance`.
 *
 *   GET    /content-pack-loader              list (packCode, status)
 *   GET    /content-pack-loader/:id          single import row
 *   POST   /content-pack-loader/load         idempotent load (success | noop)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listContentPackImports, getContentPackImport, loadContentPack,
  type ImportStatus, type ContentPack,
} from '../../application/content-pack-loader/content-pack-loader.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ContentPackLoaderRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ContentPackLoaderRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ContentPackLoaderRouterContext | Promise<ContentPackLoaderRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ContentPackLoaderRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createContentPackLoaderRouter(deps: ContentPackLoaderRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('content_pack_loader_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/content-pack-loader', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'content_pack.import.read', res))) return;
    try {
      const out = await listContentPackImports(deps.client, {
        tenantSchema: ctx.tenantSchema,
        packCode: typeof req.query.packCode === 'string' ? req.query.packCode : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as ImportStatus : undefined,
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

  router.get('/content-pack-loader/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'content_pack.import.read', res))) return;
    try {
      const row = await getContentPackImport(deps.client, {
        tenantSchema: ctx.tenantSchema, importId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `import ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/content-pack-loader/load', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'content_pack.import.write', res))) return;
    try {
      const pack = req.body?.pack as ContentPack | undefined;
      if (!pack || typeof pack !== 'object') {
        return fail(res, 400, 'bad_input', 'pack object required');
      }
      const created = await loadContentPack(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId, pack,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'content_pack.load',
          resourceType: 'content_pack_import', resourceId: created.importId,
          after: {
            packCode: created.packCode, version: created.version,
            status: created.status,
            insertedFrameworks: created.insertedFrameworks,
            insertedRequirements: created.insertedRequirements,
            insertedInstrumentNodes: created.insertedInstrumentNodes,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'load_failed', String(err.message));
    }
  });

  return router;
}
