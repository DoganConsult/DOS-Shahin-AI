/**
 * Feature-Flags REST router (W77) — sub-router on `/api/compliance`.
 *
 *   GET    /feature-flags                       list (enabled filter)
 *   GET    /feature-flags/:code                 fetch
 *   POST   /feature-flags                       upsert
 *   DELETE /feature-flags/:code                 remove
 *   GET    /feature-flags/:code/evaluate        evaluate for context user (or ?userId=)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  upsertFlag, getFlag, listFlags, deleteFlag, evaluate,
} from '../../application/feature-flags/feature-flags.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface FeatureFlagsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface FeatureFlagsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => FeatureFlagsRouterContext | Promise<FeatureFlagsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: FeatureFlagsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createFeatureFlagsRouter(
  deps: FeatureFlagsRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('feature_flags_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/feature-flags', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'feature_flag.read', res))) return;
    try {
      const out = await listFlags(deps.client, {
        tenantSchema: ctx.tenantSchema,
        enabled: req.query.enabled === undefined ? undefined : req.query.enabled === 'true',
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

  router.get('/feature-flags/:code', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'feature_flag.read', res))) return;
    try {
      const row = await getFlag(deps.client, {
        tenantSchema: ctx.tenantSchema, flagCode: req.params.code,
      });
      if (!row) return fail(res, 404, 'not_found', `flag ${req.params.code} not found`);
      res.json({ data: row });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/feature-flags', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'feature_flag.write', res))) return;
    try {
      const row = await upsertFlag(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        flagCode: String(req.body?.flagCode ?? ''),
        enabled: !!req.body?.enabled,
        rolloutPercent: req.body?.rolloutPercent === undefined ? undefined : Number(req.body.rolloutPercent),
        allowedUsers: Array.isArray(req.body?.allowedUsers) ? req.body.allowedUsers : undefined,
        deniedUsers: Array.isArray(req.body?.deniedUsers) ? req.body.deniedUsers : undefined,
        metadata: (req.body?.metadata && typeof req.body.metadata === 'object') ? req.body.metadata : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'feature_flag.upsert',
          resourceType: 'feature_flag', resourceId: row.flagCode,
          after: { enabled: row.enabled, rolloutPercent: row.rolloutPercent },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'upsert_failed', String(err.message));
    }
  });

  router.delete('/feature-flags/:code', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'feature_flag.write', res))) return;
    try {
      const ok = await deleteFlag(deps.client, {
        tenantSchema: ctx.tenantSchema, flagCode: req.params.code,
      });
      if (!ok) return fail(res, 404, 'not_found', `flag ${req.params.code} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'feature_flag.delete',
          resourceType: 'feature_flag', resourceId: req.params.code,
        });
      } catch { /* noop */ }
      res.status(204).end();
    } catch (e) {
      return fail(res, 500, 'delete_failed', String((e as Error).message));
    }
  });

  router.get('/feature-flags/:code/evaluate', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'feature_flag.read', res))) return;
    try {
      const userId = typeof req.query.userId === 'string' ? req.query.userId : ctx.userId;
      const result = await evaluate(deps.client, {
        tenantSchema: ctx.tenantSchema, flagCode: req.params.code, userId,
      });
      res.json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'evaluate_failed', String(err.message));
    }
  });

  return router;
}
