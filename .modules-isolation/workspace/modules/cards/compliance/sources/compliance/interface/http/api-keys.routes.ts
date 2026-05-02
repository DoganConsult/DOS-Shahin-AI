/**
 * API-Keys REST router (W78) — sub-router on `/api/compliance`.
 *
 *   GET    /api-keys                      list (status filter)
 *   GET    /api-keys/:id                  fetch
 *   POST   /api-keys                      issue (returns plaintext ONCE)
 *   POST   /api-keys/:id/revoke           revoke (idempotent)
 *   POST   /api-keys/verify               verify a plaintext key
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  issueKey, getKey, listKeys, revokeKey, verifyKey,
} from '../../application/api-keys/api-keys.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ApiKeysRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ApiKeysRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ApiKeysRouterContext | Promise<ApiKeysRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ApiKeysRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createApiKeysRouter(deps: ApiKeysRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('api_keys_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/api-keys', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'api_key.read', res))) return;
    try {
      const out = await listKeys(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as never : undefined,
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

  router.get('/api-keys/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'api_key.read', res))) return;
    try {
      const row = await getKey(deps.client, {
        tenantSchema: ctx.tenantSchema, keyId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `api key ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/api-keys', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'api_key.write', res))) return;
    try {
      const out = await issueKey(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        label: String(req.body?.label ?? ''),
        scopes: Array.isArray(req.body?.scopes) ? req.body.scopes : undefined,
        expiresAt: req.body?.expiresAt ?? null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'api_key.issue',
          resourceType: 'api_key', resourceId: out.row.keyId,
          after: { label: out.row.label, scopes: out.row.scopes },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: { row: out.row, plaintext: out.plaintext } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'issue_failed', String(err.message));
    }
  });

  router.post('/api-keys/:id/revoke', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'api_key.write', res))) return;
    try {
      const row = await revokeKey(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        keyId: req.params.id,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'api_key.revoke',
          resourceType: 'api_key', resourceId: row.keyId,
          after: { status: row.status },
        });
      } catch { /* noop */ }
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      return fail(res, 500, 'revoke_failed', String(err.message));
    }
  });

  router.post('/api-keys/verify', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'api_key.verify', res))) return;
    try {
      const result = await verifyKey(deps.client, {
        tenantSchema: ctx.tenantSchema,
        plaintext: String(req.body?.plaintext ?? ''),
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'api_key.verify',
          resourceType: 'api_key', resourceId: result.row?.keyId ?? 'unknown',
          after: { reason: result.reason, ok: result.ok },
        });
      } catch { /* noop */ }
      res.json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'verify_failed', String(err.message));
    }
  });

  return router;
}
