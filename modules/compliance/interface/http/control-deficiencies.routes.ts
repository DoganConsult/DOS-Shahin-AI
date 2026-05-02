/**
 * Control-Deficiencies REST router (W35) — sub-router on composite `/api/compliance`.
 *
 *   GET    /control-deficiencies                       list (controlId, status, severity, paging)
 *   GET    /control-deficiencies/:id                   single
 *   POST   /control-deficiencies                       create
 *   PATCH  /control-deficiencies/:id/status            transition status (+optional closureNotes)
 *   DELETE /control-deficiencies/:id                   remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listDeficiencies, getDeficiency, createDeficiency,
  updateDeficiencyStatus, deleteDeficiency,
  type DeficiencyStatus, type DeficiencySeverity,
} from '../../application/control-deficiencies/control-deficiencies.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ControlDeficienciesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ControlDeficienciesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ControlDeficienciesRouterContext | Promise<ControlDeficienciesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ControlDeficienciesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createControlDeficienciesRouter(deps: ControlDeficienciesRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_control_deficiencies_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/control-deficiencies', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_deficiency.finding.read', res))) return;
    try {
      const out = await listDeficiencies(deps.client, {
        tenantSchema: ctx.tenantSchema,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as DeficiencyStatus : undefined,
        severity: typeof req.query.severity === 'string' ? req.query.severity as DeficiencySeverity : undefined,
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

  router.get('/control-deficiencies/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_deficiency.finding.read', res))) return;
    try {
      const row = await getDeficiency(deps.client, {
        tenantSchema: ctx.tenantSchema, deficiencyId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `deficiency ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/control-deficiencies', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_deficiency.finding.write', res))) return;
    try {
      const created = await createDeficiency(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : '',
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        severity: typeof req.body?.severity === 'string' ? req.body.severity as DeficiencySeverity : undefined,
        identifiedBy: typeof req.body?.identifiedBy === 'string' ? req.body.identifiedBy : null,
        remediationPlan: typeof req.body?.remediationPlan === 'string' ? req.body.remediationPlan : null,
        remediationOwner: typeof req.body?.remediationOwner === 'string' ? req.body.remediationOwner : null,
        remediationDeadline: typeof req.body?.remediationDeadline === 'string' ? req.body.remediationDeadline : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_deficiency.create',
          resourceType: 'control_deficiency', resourceId: created.deficiencyId,
          after: { controlId: created.controlId, title: created.title, severity: created.severity },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_severity') return fail(res, 400, 'bad_severity', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/control-deficiencies/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_deficiency.finding.write', res))) return;
    try {
      const before = await getDeficiency(deps.client, {
        tenantSchema: ctx.tenantSchema, deficiencyId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `deficiency ${req.params.id} not found`);
      const updated = await updateDeficiencyStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        deficiencyId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as DeficiencyStatus : 'identified',
        closureNotes: typeof req.body?.closureNotes === 'string' ? req.body.closureNotes : null,
      });
      if (!updated) return fail(res, 404, 'not_found', `deficiency ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_deficiency.status',
          resourceType: 'control_deficiency', resourceId: updated.deficiencyId,
          before: { status: before.status, closureNotes: before.closureNotes },
          after: { status: updated.status, closureNotes: updated.closureNotes },
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

  router.delete('/control-deficiencies/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_deficiency.finding.write', res))) return;
    try {
      const before = await getDeficiency(deps.client, {
        tenantSchema: ctx.tenantSchema, deficiencyId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `deficiency ${req.params.id} not found`);
      const removed = await deleteDeficiency(deps.client, {
        tenantSchema: ctx.tenantSchema, deficiencyId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `deficiency ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_deficiency.delete',
          resourceType: 'control_deficiency', resourceId: removed.deficiencyId,
          before: { controlId: before.controlId, title: before.title, status: before.status },
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
