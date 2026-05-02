/**
 * Regulatory Changes REST router (W18) — sub-router on composite `/api/compliance`.
 *
 *   GET   /regulatory-changes                list (regulationName, changeType, status, assignedTo, paging)
 *   GET   /regulatory-changes/:id            single
 *   POST  /regulatory-changes                create
 *   PATCH /regulatory-changes/:id/status     transition status (optional assignedTo update)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listRegulatoryChanges, getRegulatoryChange,
  createRegulatoryChange, updateRegulatoryChangeStatus,
} from '../../application/regulatory-changes/regulatory-changes.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface RegulatoryChangesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface RegulatoryChangesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => RegulatoryChangesRouterContext | Promise<RegulatoryChangesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: RegulatoryChangesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createRegulatoryChangesRouter(deps: RegulatoryChangesRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_regulatory_changes_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/regulatory-changes', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulatory_change.record.read', res))) return;
    try {
      const out = await listRegulatoryChanges(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        regulationName: typeof req.query.regulationName === 'string' ? req.query.regulationName : undefined,
        changeType: typeof req.query.changeType === 'string' ? req.query.changeType : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        assignedTo: typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined,
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

  router.get('/regulatory-changes/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulatory_change.record.read', res))) return;
    try {
      const row = await getRegulatoryChange(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `regulatory-change ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/regulatory-changes', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulatory_change.record.write', res))) return;
    try {
      const created = await createRegulatoryChange(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        regulationName: typeof req.body?.regulationName === 'string' ? req.body.regulationName : '',
        changeType: typeof req.body?.changeType === 'string' ? req.body.changeType : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        effectiveDate: typeof req.body?.effectiveDate === 'string' ? req.body.effectiveDate : null,
        impactAssessment: typeof req.body?.impactAssessment === 'string' ? req.body.impactAssessment : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
        assignedTo: typeof req.body?.assignedTo === 'string' ? req.body.assignedTo : null,
        actionItems: Array.isArray(req.body?.actionItems) ? req.body.actionItems : [],
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'regulatory_change.create',
          resourceType: 'compliance_regulatory_change', resourceId: created.id,
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

  router.patch('/regulatory-changes/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'regulatory_change.record.write', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const assignedTo = typeof req.body?.assignedTo === 'string' ? req.body.assignedTo : null;
      const before = await getRegulatoryChange(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `regulatory-change ${req.params.id} not found`);
      const updated = await updateRegulatoryChangeStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never, assignedTo,
      });
      if (!updated) return fail(res, 404, 'not_found', `regulatory-change ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'regulatory_change.status_change',
          resourceType: 'compliance_regulatory_change', resourceId: updated.id,
          before: { status: before.status, assignedTo: before.assignedTo },
          after: { status: updated.status, assignedTo: updated.assignedTo },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'update_failed', String(err.message));
    }
  });

  return router;
}
