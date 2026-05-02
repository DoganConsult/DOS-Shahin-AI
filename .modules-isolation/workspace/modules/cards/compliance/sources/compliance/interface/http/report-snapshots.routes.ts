/**
 * Report-Snapshots REST router (W32) — sub-router on composite `/api/compliance`.
 *
 *   GET    /report-snapshots             list (reportType, generatedBy, includeExpired, paging)
 *   GET    /report-snapshots/:id         single
 *   POST   /report-snapshots             create snapshot
 *   DELETE /report-snapshots/:id         hard-delete (purge expired)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listReportSnapshots, getReportSnapshot, createReportSnapshot, deleteReportSnapshot,
} from '../../application/report-snapshots/report-snapshots.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ReportSnapshotsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ReportSnapshotsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ReportSnapshotsRouterContext | Promise<ReportSnapshotsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ReportSnapshotsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createReportSnapshotsRouter(deps: ReportSnapshotsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_report_snapshots_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/report-snapshots', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'report_snapshot.snapshot.read', res))) return;
    try {
      const out = await listReportSnapshots(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        reportType: typeof req.query.reportType === 'string' ? req.query.reportType : undefined,
        generatedBy: typeof req.query.generatedBy === 'string' ? req.query.generatedBy : undefined,
        includeExpired: req.query.includeExpired === 'true' || req.query.includeExpired === '1',
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

  router.get('/report-snapshots/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'report_snapshot.snapshot.read', res))) return;
    try {
      const row = await getReportSnapshot(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `report-snapshot ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/report-snapshots', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'report_snapshot.snapshot.write', res))) return;
    try {
      const created = await createReportSnapshot(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        reportType: typeof req.body?.reportType === 'string' ? req.body.reportType : '',
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        parameters: req.body?.parameters && typeof req.body.parameters === 'object'
          ? req.body.parameters as Record<string, unknown> : undefined,
        resultData: req.body?.resultData && typeof req.body.resultData === 'object'
          ? req.body.resultData as Record<string, unknown> : undefined,
        expiresAt: typeof req.body?.expiresAt === 'string' ? req.body.expiresAt : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'report_snapshot.create',
          resourceType: 'compliance_report_snapshot', resourceId: created.id,
          after: { id: created.id, reportType: created.reportType, title: created.title },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.delete('/report-snapshots/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'report_snapshot.snapshot.write', res))) return;
    try {
      const before = await getReportSnapshot(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `report-snapshot ${req.params.id} not found`);
      const removed = await deleteReportSnapshot(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `report-snapshot ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'report_snapshot.delete',
          resourceType: 'compliance_report_snapshot', resourceId: removed.id,
          before: { id: before.id, reportType: before.reportType, title: before.title, generatedAt: before.generatedAt },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: removed });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'delete_failed', String(err.message));
    }
  });

  return router;
}
