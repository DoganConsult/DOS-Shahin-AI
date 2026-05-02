/**
 * Audit-Log-Stream REST router (W73) — sub-router on `/api/compliance`.
 *
 *   GET /audit-log-stream         cursor-paginated list with filters
 *   GET /audit-log-stream/count   total under filters (no cursor/limit)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listAuditEvents, countAuditEvents,
} from '../../application/audit-log-stream/audit-log-stream.service';
import { incCounter } from '../../application/observability/metrics';

export interface AuditLogStreamRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface AuditLogStreamRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => AuditLogStreamRouterContext | Promise<AuditLogStreamRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: AuditLogStreamRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

const str = (q: unknown): string | undefined =>
  typeof q === 'string' && q.length > 0 ? q : undefined;

export function createAuditLogStreamRouter(
  deps: AuditLogStreamRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('audit_log_stream_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/audit-log-stream', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'audit.read', res))) return;
    try {
      const out = await listAuditEvents(deps.client, {
        tenantSchema: ctx.tenantSchema,
        module: str(req.query.module),
        action: str(req.query.action),
        actorId: str(req.query.actorId),
        resourceType: str(req.query.resourceType),
        resourceId: str(req.query.resourceId),
        occurredFrom: str(req.query.occurredFrom),
        occurredTo: str(req.query.occurredTo),
        cursor: str(req.query.cursor),
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ data: out.rows, meta: { nextCursor: out.nextCursor } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_cursor') return fail(res, 400, 'bad_cursor', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/audit-log-stream/count', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'audit.read', res))) return;
    try {
      const total = await countAuditEvents(deps.client, {
        tenantSchema: ctx.tenantSchema,
        module: str(req.query.module),
        action: str(req.query.action),
        actorId: str(req.query.actorId),
        resourceType: str(req.query.resourceType),
        resourceId: str(req.query.resourceId),
        occurredFrom: str(req.query.occurredFrom),
        occurredTo: str(req.query.occurredTo),
      });
      res.json({ data: { total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'count_failed', String(err.message));
    }
  });

  return router;
}
