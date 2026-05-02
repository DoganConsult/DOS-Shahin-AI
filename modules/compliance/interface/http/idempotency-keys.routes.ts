/**
 * Idempotency-Keys REST router (W76) — sub-router on `/api/compliance`.
 *
 *   GET  /idempotency-keys                 list (scope filter)
 *   GET  /idempotency-keys/:scope/:key     lookup
 *   POST /idempotency-keys                 record result (idempotent)
 *   POST /idempotency-keys/purge           delete expired
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  recordResult, lookup, purgeExpired, listKeys,
} from '../../application/idempotency-keys/idempotency-keys.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface IdempotencyKeysRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface IdempotencyKeysRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => IdempotencyKeysRouterContext | Promise<IdempotencyKeysRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: IdempotencyKeysRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createIdempotencyKeysRouter(
  deps: IdempotencyKeysRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('idempotency_keys_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/idempotency-keys', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'idempotency.read', res))) return;
    try {
      const out = await listKeys(deps.client, {
        tenantSchema: ctx.tenantSchema,
        scope: typeof req.query.scope === 'string' ? req.query.scope : undefined,
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

  router.get('/idempotency-keys/:scope/:key', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'idempotency.read', res))) return;
    try {
      const row = await lookup(deps.client, {
        tenantSchema: ctx.tenantSchema,
        scope: req.params.scope, key: req.params.key,
      });
      if (!row) return fail(res, 404, 'not_found', `idempotency key not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'lookup_failed', String(err.message));
    }
  });

  router.post('/idempotency-keys', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'idempotency.write', res))) return;
    try {
      const result = await recordResult(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        scope: String(req.body?.scope ?? ''),
        key: String(req.body?.key ?? ''),
        requestHash: String(req.body?.requestHash ?? ''),
        responseStatus: Number(req.body?.responseStatus),
        responseBody: (req.body?.responseBody && typeof req.body.responseBody === 'object')
          ? req.body.responseBody : null,
        ttlSeconds: req.body?.ttlSeconds === undefined ? undefined : Number(req.body.ttlSeconds),
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'idempotency.record',
          resourceType: 'idempotency_key',
          resourceId: `${result.row.scope}:${result.row.key}`,
          after: { stored: result.stored, conflict: result.conflict },
        });
      } catch { /* noop */ }
      res.status(result.stored ? 201 : 200).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_conflict') return fail(res, 409, 'bad_conflict', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'record_failed', String(err.message));
    }
  });

  router.post('/idempotency-keys/purge', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'idempotency.write', res))) return;
    try {
      const result = await purgeExpired(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'idempotency.purge',
          resourceType: 'idempotency_key', resourceId: 'batch',
          after: { scanned: result.scanned, deleted: result.deleted },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'purge_failed', String(err.message));
    }
  });

  return router;
}
