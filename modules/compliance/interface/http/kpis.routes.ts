/**
 * KPIs REST router (W25) — sub-router on composite `/api/compliance`.
 *
 *   GET   /kpis                list (kpiCode, trend, paging)
 *   GET   /kpis/:id            single
 *   POST  /kpis                create
 *   PATCH /kpis/:id/value      record value (currentValue + optional trend, stamps computed_at)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listKpis, getKpi, createKpi, recordKpiValue,
} from '../../application/kpis/kpis.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface KpisRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface KpisRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => KpisRouterContext | Promise<KpisRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: KpisRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createKpisRouter(deps: KpisRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_kpis_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/kpis', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'kpi.metric.read', res))) return;
    try {
      const out = await listKpis(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        kpiCode: typeof req.query.kpiCode === 'string' ? req.query.kpiCode : undefined,
        trend: typeof req.query.trend === 'string' ? (req.query.trend as never) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_trend') return fail(res, 400, 'bad_trend', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/kpis/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'kpi.metric.read', res))) return;
    try {
      const row = await getKpi(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `kpi ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/kpis', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'kpi.metric.write', res))) return;
    try {
      const created = await createKpi(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        kpiCode: typeof req.body?.kpiCode === 'string' ? req.body.kpiCode : '',
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        currentValue: typeof req.body?.currentValue === 'number' ? req.body.currentValue : null,
        targetValue: typeof req.body?.targetValue === 'number' ? req.body.targetValue : null,
        unit: typeof req.body?.unit === 'string' ? req.body.unit : null,
        periodStart: typeof req.body?.periodStart === 'string' ? req.body.periodStart : null,
        periodEnd: typeof req.body?.periodEnd === 'string' ? req.body.periodEnd : null,
        trend: typeof req.body?.trend === 'string' ? (req.body.trend as never) : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'kpi.create',
          resourceType: 'compliance_kpi', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_trend') return fail(res, 400, 'bad_trend', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/kpis/:id/value', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'kpi.metric.write', res))) return;
    try {
      const currentValue = typeof req.body?.currentValue === 'number' ? req.body.currentValue : NaN;
      const trend = typeof req.body?.trend === 'string' ? (req.body.trend as never) : undefined;
      const before = await getKpi(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `kpi ${req.params.id} not found`);
      const updated = await recordKpiValue(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, currentValue, trend,
      });
      if (!updated) return fail(res, 404, 'not_found', `kpi ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'kpi.value_change',
          resourceType: 'compliance_kpi', resourceId: updated.id,
          before: { currentValue: before.currentValue, trend: before.trend },
          after: { currentValue: updated.currentValue, trend: updated.trend },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_trend') return fail(res, 400, 'bad_trend', err.message);
      return fail(res, 500, 'value_change_failed', String(err.message));
    }
  });

  return router;
}
