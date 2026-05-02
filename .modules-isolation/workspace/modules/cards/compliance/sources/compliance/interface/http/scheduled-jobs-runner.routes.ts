/**
 * Scheduled-Jobs-Runner REST router (W74) — sub-router on `/api/compliance`.
 *
 *   GET  /scheduled-jobs                list (enabled filter)
 *   GET  /scheduled-jobs/:code          fetch one
 *   POST /scheduled-jobs                upsert by job_code
 *   GET  /scheduled-jobs-runs           list runs (jobCode/status filters)
 *   POST /scheduled-jobs-runner/run     execute due jobs (optional jobCode scope)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  upsertJob, getJob, listJobs, listJobRuns, runDue,
  type ScheduledJobRunStatus, type ScheduledJobRow,
} from '../../application/scheduled-jobs-runner/scheduled-jobs-runner.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ScheduledJobsRunnerRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
  /** Host-supplied per-job handlers, keyed by job_code. */
  handlers?: Record<string, (job: ScheduledJobRow) => Promise<void> | void>;
}

export interface ScheduledJobsRunnerRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ScheduledJobsRunnerRouterContext | Promise<ScheduledJobsRunnerRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ScheduledJobsRunnerRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createScheduledJobsRunnerRouter(
  deps: ScheduledJobsRunnerRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('scheduled_jobs_runner_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/scheduled-jobs', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'scheduled_jobs.read', res))) return;
    try {
      const out = await listJobs(deps.client, {
        tenantSchema: ctx.tenantSchema,
        enabled: req.query.enabled === undefined ? undefined : req.query.enabled === 'true',
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/scheduled-jobs/:code', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'scheduled_jobs.read', res))) return;
    try {
      const row = await getJob(deps.client, {
        tenantSchema: ctx.tenantSchema, jobCode: req.params.code,
      });
      if (!row) return fail(res, 404, 'not_found', `job ${req.params.code} not found`);
      res.json({ data: row });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/scheduled-jobs', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'scheduled_jobs.write', res))) return;
    try {
      const row = await upsertJob(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        jobCode: String(req.body?.jobCode ?? ''),
        intervalSeconds: Number(req.body?.intervalSeconds),
        enabled: req.body?.enabled,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'scheduled_jobs.upsert',
          resourceType: 'scheduled_job', resourceId: row.jobCode,
          after: { intervalSeconds: row.intervalSeconds, enabled: row.enabled },
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

  router.get('/scheduled-jobs-runs', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'scheduled_jobs.read', res))) return;
    try {
      const out = await listJobRuns(deps.client, {
        tenantSchema: ctx.tenantSchema,
        jobCode: typeof req.query.jobCode === 'string' ? req.query.jobCode : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as ScheduledJobRunStatus : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      return fail(res, 500, 'list_runs_failed', String((e as Error).message));
    }
  });

  router.post('/scheduled-jobs-runner/run', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'scheduled_jobs.write', res))) return;
    try {
      const result = await runDue(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        jobCode: typeof req.body?.jobCode === 'string' ? req.body.jobCode : undefined,
        handlers: ctx.handlers,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'scheduled_jobs.run',
          resourceType: 'scheduled_jobs_runner', resourceId: 'batch',
          after: {
            scanned: result.scanned, succeeded: result.succeeded,
            failed: result.failed, skipped: result.skipped,
          },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'run_failed', String(err.message));
    }
  });

  return router;
}
