/**
 * Change-Log REST router (W30) — sub-router on composite `/api/compliance`.
 *
 *   GET  /change-log                list (entityType, entityId, fieldName, changedBy, correlationId, paging)
 *   GET  /change-log/:id            single
 *   POST /change-log                record a change (append-only)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listChangeLog, getChangeLog, recordChange,
} from '../../application/change-log/change-log.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ChangeLogRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ChangeLogRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ChangeLogRouterContext | Promise<ChangeLogRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ChangeLogRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createChangeLogRouter(deps: ChangeLogRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_change_log_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/change-log', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'change_log.entry.read', res))) return;
    try {
      const out = await listChangeLog(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        fieldName: typeof req.query.fieldName === 'string' ? req.query.fieldName : undefined,
        changedBy: typeof req.query.changedBy === 'string' ? req.query.changedBy : undefined,
        correlationId: typeof req.query.correlationId === 'string' ? req.query.correlationId : undefined,
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

  router.get('/change-log/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'change_log.entry.read', res))) return;
    try {
      const row = await getChangeLog(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `change-log entry ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/change-log', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'change_log.entry.write', res))) return;
    try {
      const created = await recordChange(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType : '',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : '',
        fieldName: typeof req.body?.fieldName === 'string' ? req.body.fieldName : '',
        oldValue: typeof req.body?.oldValue === 'string' ? req.body.oldValue : null,
        newValue: typeof req.body?.newValue === 'string' ? req.body.newValue : null,
        correlationId: typeof req.body?.correlationId === 'string' ? req.body.correlationId : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'change_log.record',
          resourceType: 'compliance_change_log', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'record_failed', String(err.message));
    }
  });

  return router;
}
