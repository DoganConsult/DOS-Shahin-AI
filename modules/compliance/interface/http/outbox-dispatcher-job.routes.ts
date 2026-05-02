/**
 * Outbox-Dispatcher Job REST router (W65) — sub-router on `/api/compliance`.
 *
 *   GET    /outbox-dispatcher-job              list runs (status filter)
 *   POST   /outbox-dispatcher-job/run-once     trigger one drain cycle
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listRuns, executeRun,
  type DispatcherStatus,
} from '../../application/outbox-dispatcher-job/outbox-dispatcher-job.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface OutboxDispatcherJobRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface OutboxDispatcherJobRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => OutboxDispatcherJobRouterContext | Promise<OutboxDispatcherJobRouterContext>;
  /** Optional handler invoked per pending event during dispatch. */
  dispatchHandler?: Parameters<typeof executeRun>[0]['handler'];
  /** Optional injectable batch size (1..500). */
  batch?: number;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: OutboxDispatcherJobRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createOutboxDispatcherJobRouter(deps: OutboxDispatcherJobRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('outbox_dispatcher_job_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/outbox-dispatcher-job', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.dispatcher.read', res))) return;
    try {
      const out = await listRuns(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as DispatcherStatus : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.post('/outbox-dispatcher-job/run-once', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.dispatcher.write', res))) return;
    try {
      const lockToken = typeof req.body?.lockToken === 'string' && req.body.lockToken.length > 0
        ? req.body.lockToken : `disp_http_${Date.now().toString(36)}`;
      const run = await executeRun({
        client: deps.client,
        tenantSchema: ctx.tenantSchema,
        batch: req.body?.batch ? Number(req.body.batch) : deps.batch,
        handler: deps.dispatchHandler,
        lockToken,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'event.dispatcher.run',
          resourceType: 'outbox_dispatcher_run', resourceId: run.runId,
          after: {
            scanned: run.scanned, dispatched: run.dispatched,
            failed: run.failed, status: run.status,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: run });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'run_failed', String(err.message));
    }
  });

  return router;
}
