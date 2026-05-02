/**
 * Retry-Backoff Policy REST router (W66) — sub-router on `/api/compliance`.
 *
 *   GET  /retry-backoff-policy            list past retry decisions
 *   POST /retry-backoff-policy/run        plan retries against current failed
 *                                         outbox rows; requeues or skips per
 *                                         exponential backoff policy.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listRetryDecisions, planRetries,
  type RetryAction, type RetryPolicy,
} from '../../application/retry-backoff-policy/retry-backoff-policy.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface RetryBackoffPolicyRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface RetryBackoffPolicyRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RetryBackoffPolicyRouterContext | Promise<RetryBackoffPolicyRouterContext>;
  /** Default policy applied when request omits one. */
  defaultPolicy?: RetryPolicy;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: RetryBackoffPolicyRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

function coercePolicy(input: unknown): RetryPolicy | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const o = input as Record<string, unknown>;
  const out: RetryPolicy = {};
  if (o.baseMs !== undefined) out.baseMs = Number(o.baseMs);
  if (o.factor !== undefined) out.factor = Number(o.factor);
  if (o.maxDelayMs !== undefined) out.maxDelayMs = Number(o.maxDelayMs);
  if (o.maxAttempts !== undefined) out.maxAttempts = Number(o.maxAttempts);
  if (typeof o.dropOnExhausted === 'boolean') out.dropOnExhausted = o.dropOnExhausted;
  return out;
}

export function createRetryBackoffPolicyRouter(deps: RetryBackoffPolicyRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('retry_backoff_policy_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/retry-backoff-policy', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.retry.read', res))) return;
    try {
      const out = await listRetryDecisions(deps.client, {
        tenantSchema: ctx.tenantSchema,
        eventId: typeof req.query.eventId === 'string' ? req.query.eventId : undefined,
        action: typeof req.query.action === 'string' ? req.query.action as RetryAction : undefined,
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

  router.post('/retry-backoff-policy/run', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.retry.write', res))) return;
    try {
      const policy = coercePolicy(req.body?.policy) ?? deps.defaultPolicy;
      const result = await planRetries(deps.client, {
        tenantSchema: ctx.tenantSchema,
        actorId: ctx.userId,
        policy,
        batch: req.body?.batch ? Number(req.body.batch) : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'event.retry.run',
          resourceType: 'retry_decision_batch', resourceId: 'batch',
          after: {
            scanned: result.scanned, requeued: result.requeued,
            skippedTooSoon: result.skippedTooSoon,
            skippedExhausted: result.skippedExhausted, dropped: result.dropped,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_action') return fail(res, 500, 'bad_action', err.message);
      return fail(res, 500, 'run_failed', String(err.message));
    }
  });

  return router;
}
