/**
 * Regulator-Bulletins REST router (W53) — sub-router on `/api/compliance`.
 *
 *   GET    /regulator-bulletins             list (regulatorCode, severity, status, publishedSince, search)
 *   GET    /regulator-bulletins/:id         single
 *   POST   /regulator-bulletins             create
 *   PATCH  /regulator-bulletins/:id/status  status transition (auto-stamps published_at on `published`)
 *   DELETE /regulator-bulletins/:id         remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listRegulatorBulletins, getRegulatorBulletin,
  createRegulatorBulletin, updateRegulatorBulletinStatus, deleteRegulatorBulletin,
  type BulletinSeverity, type BulletinStatus,
} from '../../application/regulator-bulletins/regulator-bulletins.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface RegulatorBulletinsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface RegulatorBulletinsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RegulatorBulletinsRouterContext | Promise<RegulatorBulletinsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: RegulatorBulletinsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createRegulatorBulletinsRouter(deps: RegulatorBulletinsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_regulator_bulletins_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/regulator-bulletins', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulator_bulletin.bulletin.read', res))) return;
    try {
      const out = await listRegulatorBulletins(deps.client, {
        tenantSchema: ctx.tenantSchema,
        regulatorCode: typeof req.query.regulatorCode === 'string' ? req.query.regulatorCode : undefined,
        severity: typeof req.query.severity === 'string' ? req.query.severity as BulletinSeverity : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as BulletinStatus : undefined,
        publishedSince: typeof req.query.publishedSince === 'string' ? req.query.publishedSince : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
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

  router.get('/regulator-bulletins/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulator_bulletin.bulletin.read', res))) return;
    try {
      const row = await getRegulatorBulletin(deps.client, {
        tenantSchema: ctx.tenantSchema, bulletinId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `bulletin ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/regulator-bulletins', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulator_bulletin.bulletin.write', res))) return;
    try {
      const created = await createRegulatorBulletin(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        regulatorCode: typeof req.body?.regulatorCode === 'string' ? req.body.regulatorCode : '',
        bulletinCode: typeof req.body?.bulletinCode === 'string' ? req.body.bulletinCode : '',
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        summary: typeof req.body?.summary === 'string' ? req.body.summary : undefined,
        severity: typeof req.body?.severity === 'string' ? req.body.severity as BulletinSeverity : undefined,
        status: typeof req.body?.status === 'string' ? req.body.status as BulletinStatus : undefined,
        publishedAt: typeof req.body?.publishedAt === 'string' ? req.body.publishedAt : undefined,
        effectiveDate: typeof req.body?.effectiveDate === 'string' ? req.body.effectiveDate : undefined,
        sourceUrl: typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'regulator_bulletin.create',
          resourceType: 'regulator_bulletin', resourceId: created.bulletinId,
          after: {
            regulatorCode: created.regulatorCode,
            bulletinCode: created.bulletinCode,
            severity: created.severity, status: created.status,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_severity') return fail(res, 400, 'bad_severity', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/regulator-bulletins/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulator_bulletin.bulletin.write', res))) return;
    try {
      const before = await getRegulatorBulletin(deps.client, {
        tenantSchema: ctx.tenantSchema, bulletinId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `bulletin ${req.params.id} not found`);
      const updated = await updateRegulatorBulletinStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        bulletinId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as BulletinStatus : '' as BulletinStatus,
      });
      if (!updated) return fail(res, 404, 'not_found', `bulletin ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'regulator_bulletin.status',
          resourceType: 'regulator_bulletin', resourceId: updated.bulletinId,
          before: { status: before.status }, after: { status: updated.status },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'status_failed', String(err.message));
    }
  });

  router.delete('/regulator-bulletins/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulator_bulletin.bulletin.write', res))) return;
    try {
      const before = await getRegulatorBulletin(deps.client, {
        tenantSchema: ctx.tenantSchema, bulletinId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `bulletin ${req.params.id} not found`);
      const removed = await deleteRegulatorBulletin(deps.client, {
        tenantSchema: ctx.tenantSchema, bulletinId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `bulletin ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'regulator_bulletin.delete',
          resourceType: 'regulator_bulletin', resourceId: removed.bulletinId,
          before: { regulatorCode: before.regulatorCode, bulletinCode: before.bulletinCode },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(204).end();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'delete_failed', String(err.message));
    }
  });

  return router;
}
