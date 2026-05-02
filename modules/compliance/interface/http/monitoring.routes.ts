/**
 * Monitoring REST router (W19) — sub-router on composite `/api/compliance`.
 *
 *   GET   /monitoring                list (requirementId, monitoringType, status, automated, paging)
 *   GET   /monitoring/:id            single
 *   POST  /monitoring                create
 *   PATCH /monitoring/:id/check      record monitoring check (sets last_checked/next_check, optional status)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listMonitoring, getMonitoring,
  createMonitoring, recordMonitoringCheck,
} from '../../application/monitoring/monitoring.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface MonitoringRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface MonitoringRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => MonitoringRouterContext | Promise<MonitoringRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: MonitoringRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

const parseBool = (q: unknown): boolean | undefined => {
  if (q === 'true') return true;
  if (q === 'false') return false;
  return undefined;
};

export function createMonitoringRouter(deps: MonitoringRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_monitoring_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/monitoring', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'monitoring.record.read', res))) return;
    try {
      const out = await listMonitoring(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : undefined,
        monitoringType: typeof req.query.monitoringType === 'string' ? req.query.monitoringType : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        automated: parseBool(req.query.automated),
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/monitoring/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'monitoring.record.read', res))) return;
    try {
      const row = await getMonitoring(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `monitoring ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/monitoring', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'monitoring.record.write', res))) return;
    try {
      const created = await createMonitoring(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        requirementId: typeof req.body?.requirementId === 'string' ? req.body.requirementId : '',
        monitoringType: typeof req.body?.monitoringType === 'string' ? req.body.monitoringType : '',
        frequency: typeof req.body?.frequency === 'string' ? req.body.frequency : null,
        lastChecked: typeof req.body?.lastChecked === 'string' ? req.body.lastChecked : null,
        nextCheck: typeof req.body?.nextCheck === 'string' ? req.body.nextCheck : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
        automated: typeof req.body?.automated === 'boolean' ? req.body.automated : false,
        alertThreshold: req.body?.alertThreshold && typeof req.body.alertThreshold === 'object'
          ? req.body.alertThreshold : {},
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'monitoring.create',
          resourceType: 'compliance_monitoring', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/monitoring/:id/check', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'monitoring.record.write', res))) return;
    try {
      const checkedAt = typeof req.body?.checkedAt === 'string' ? req.body.checkedAt : undefined;
      const nextCheck = typeof req.body?.nextCheck === 'string' ? req.body.nextCheck : null;
      const status = typeof req.body?.status === 'string' ? (req.body.status as never) : undefined;
      const before = await getMonitoring(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `monitoring ${req.params.id} not found`);
      const updated = await recordMonitoringCheck(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, checkedAt, nextCheck, status,
      });
      if (!updated) return fail(res, 404, 'not_found', `monitoring ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'monitoring.check',
          resourceType: 'compliance_monitoring', resourceId: updated.id,
          before: { status: before.status, lastChecked: before.lastChecked },
          after: { status: updated.status, lastChecked: updated.lastChecked },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'check_failed', String(err.message));
    }
  });

  return router;
}
