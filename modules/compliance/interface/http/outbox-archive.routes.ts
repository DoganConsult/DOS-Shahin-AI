/**
 * Outbox-Archive REST router (W71) — sub-router on `/api/compliance`.
 *
 *   GET  /outbox-archive       list runs (filter status)
 *   POST /outbox-archive/run   trigger archive (olderThanDays, dryRun)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listArchiveRuns, runArchive, type ArchiveRunStatus,
} from '../../application/outbox-archive/outbox-archive.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface OutboxArchiveRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface OutboxArchiveRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => OutboxArchiveRouterContext | Promise<OutboxArchiveRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: OutboxArchiveRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createOutboxArchiveRouter(deps: OutboxArchiveRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('outbox_archive_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/outbox-archive', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.archive.read', res))) return;
    try {
      const out = await listArchiveRuns(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as ArchiveRunStatus : undefined,
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

  router.post('/outbox-archive/run', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'event.archive.write', res))) return;
    try {
      const row = await runArchive(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        olderThanDays: req.body?.olderThanDays !== undefined ? Number(req.body.olderThanDays) : undefined,
        dryRun: !!req.body?.dryRun,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance',
          action: row.status === 'failed' ? 'event.archive.failed' :
                  (req.body?.dryRun ? 'event.archive.dry_run' : 'event.archive.run'),
          resourceType: 'event_outbox_archive_run', resourceId: row.runId,
          after: {
            status: row.status, scanned: row.scanned,
            archived: row.archived, deleted: row.deleted,
          },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'run_failed', String(err.message));
    }
  });

  return router;
}
