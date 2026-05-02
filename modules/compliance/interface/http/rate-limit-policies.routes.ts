/**
 * Rate-Limit-Policies REST router (W79) — sub-router on `/api/compliance`.
 *
 *   GET    /rate-limit-policies                  list (subjectKind filter)
 *   GET    /rate-limit-policies/:code            fetch
 *   POST   /rate-limit-policies                  upsert
 *   DELETE /rate-limit-policies/:code            remove
 *   POST   /rate-limit-policies/:code/check      read-only window state
 *   POST   /rate-limit-policies/:code/consume    +amount on counter
 *   POST   /rate-limit-policies/purge            purge expired counters
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  upsertPolicy, getPolicy, listPolicies, deletePolicy,
  consume, check, purgeExpiredCounters,
} from '../../application/rate-limit-policies/rate-limit-policies.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface RateLimitPoliciesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface RateLimitPoliciesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RateLimitPoliciesRouterContext | Promise<RateLimitPoliciesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: RateLimitPoliciesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createRateLimitPoliciesRouter(
  deps: RateLimitPoliciesRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('rate_limit_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/rate-limit-policies', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'rate_limit.read', res))) return;
    try {
      const out = await listPolicies(deps.client, {
        tenantSchema: ctx.tenantSchema,
        subjectKind: typeof req.query.subjectKind === 'string' ? req.query.subjectKind as never : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_subject_kind') return fail(res, 400, 'bad_subject_kind', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/rate-limit-policies/:code', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'rate_limit.read', res))) return;
    try {
      const row = await getPolicy(deps.client, {
        tenantSchema: ctx.tenantSchema, policyCode: req.params.code,
      });
      if (!row) return fail(res, 404, 'not_found', `policy ${req.params.code} not found`);
      res.json({ data: row });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/rate-limit-policies', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'rate_limit.write', res))) return;
    try {
      const row = await upsertPolicy(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        policyCode: String(req.body?.policyCode ?? ''),
        subjectKind: req.body?.subjectKind,
        windowSeconds: Number(req.body?.windowSeconds),
        maxRequests: Number(req.body?.maxRequests),
        metadata: (req.body?.metadata && typeof req.body.metadata === 'object') ? req.body.metadata : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'rate_limit.upsert',
          resourceType: 'rate_limit_policy', resourceId: row.policyCode,
          after: { subjectKind: row.subjectKind, windowSeconds: row.windowSeconds, maxRequests: row.maxRequests },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_subject_kind') return fail(res, 400, 'bad_subject_kind', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'upsert_failed', String(err.message));
    }
  });

  router.delete('/rate-limit-policies/:code', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'rate_limit.write', res))) return;
    try {
      const ok = await deletePolicy(deps.client, {
        tenantSchema: ctx.tenantSchema, policyCode: req.params.code,
      });
      if (!ok) return fail(res, 404, 'not_found', `policy ${req.params.code} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'rate_limit.delete',
          resourceType: 'rate_limit_policy', resourceId: req.params.code,
        });
      } catch { /* noop */ }
      res.status(204).end();
    } catch (e) {
      return fail(res, 500, 'delete_failed', String((e as Error).message));
    }
  });

  router.post('/rate-limit-policies/:code/check', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'rate_limit.read', res))) return;
    try {
      const out = await check(deps.client, {
        tenantSchema: ctx.tenantSchema,
        policyCode: req.params.code,
        subjectId: String(req.body?.subjectId ?? ''),
      });
      res.json({ data: out });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'check_failed', String(err.message));
    }
  });

  router.post('/rate-limit-policies/:code/consume', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'rate_limit.consume', res))) return;
    try {
      const out = await consume(deps.client, {
        tenantSchema: ctx.tenantSchema,
        policyCode: req.params.code,
        subjectId: String(req.body?.subjectId ?? ''),
        amount: req.body?.amount === undefined ? undefined : Number(req.body.amount),
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'rate_limit.consume',
          resourceType: 'rate_limit_policy', resourceId: req.params.code,
          after: { subjectId: req.body?.subjectId, allowed: out.allowed, counter: out.counter, max: out.max },
        });
      } catch { /* noop */ }
      const status = out.allowed ? 200 : 429;
      res.status(status).json({ data: out });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'consume_failed', String(err.message));
    }
  });

  router.post('/rate-limit-policies/purge', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'rate_limit.write', res))) return;
    try {
      const out = await purgeExpiredCounters(deps.client, {
        tenantSchema: ctx.tenantSchema,
        olderThanWindows: req.body?.olderThanWindows === undefined ? undefined : Number(req.body.olderThanWindows),
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'rate_limit.purge',
          resourceType: 'rate_limit_counter', resourceId: 'all',
          after: { deleted: out.deleted },
        });
      } catch { /* noop */ }
      res.json({ data: out });
    } catch (e) {
      return fail(res, 500, 'purge_failed', String((e as Error).message));
    }
  });

  return router;
}
