/**
 * Retention-Policy REST router (W68) — sub-router on `/api/compliance`.
 *
 *   GET  /retention-policy            list past runs (status filter)
 *   POST /retention-policy/run        execute (or dryRun) one purge cycle
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  runRetention, listRetentionRuns,
  type RetentionRunStatus,
} from '../../application/retention-policy/retention-policy.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface RetentionPolicyRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface RetentionPolicyRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RetentionPolicyRouterContext | Promise<RetentionPolicyRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: RetentionPolicyRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createRetentionPolicyRouter(deps: RetentionPolicyRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('retention_policy_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/retention-policy', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'retention.read', res))) return;
    try {
      const out = await listRetentionRuns(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as RetentionRunStatus : undefined,
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

  router.post('/retention-policy/run', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'retention.write', res))) return;
    try {
      const entityTypes = Array.isArray(req.body?.entityTypes)
        ? req.body.entityTypes.map((x: unknown) => String(x)) : undefined;
      const dryRun = !!req.body?.dryRun;
      const run = await runRetention(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        entityTypes, dryRun,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: dryRun ? 'retention.dry_run' : 'retention.run',
          resourceType: 'retention_run', resourceId: run.runId,
          after: {
            status: run.status, totalScanned: run.totalScanned,
            totalPurged: run.totalPurged, totalArchived: run.totalArchived,
          },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: run });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 500, 'bad_status', err.message);
      return fail(res, 500, 'run_failed', String(err.message));
    }
  });

  return router;
}
