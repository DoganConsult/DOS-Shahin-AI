/**
 * UCF-Controls REST router (W44) — sub-router on composite `/api/compliance`.
 *
 *   GET    /ucf-controls                    list (lifecycleState, owner, search)
 *   GET    /ucf-controls/:id                single
 *   POST   /ucf-controls                    create
 *   PATCH  /ucf-controls/:id                update fields (COALESCE)
 *   PATCH  /ucf-controls/:id/lifecycle      transition lifecycle_state
 *   DELETE /ucf-controls/:id                remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listUcfControls, getUcfControl, createUcfControl,
  updateUcfControl, updateUcfLifecycle, deleteUcfControl,
  type UcfLifecycleState,
} from '../../application/ucf-controls/ucf-controls.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface UcfControlsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface UcfControlsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => UcfControlsRouterContext | Promise<UcfControlsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: UcfControlsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

const arr = (v: unknown): unknown[] | undefined => Array.isArray(v) ? v : undefined;

export function createUcfControlsRouter(deps: UcfControlsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_ucf_controls_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/ucf-controls', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ucf_control.control.read', res))) return;
    try {
      const out = await listUcfControls(deps.client, {
        tenantSchema: ctx.tenantSchema,
        lifecycleState: typeof req.query.lifecycleState === 'string'
          ? req.query.lifecycleState as UcfLifecycleState : undefined,
        owner: typeof req.query.owner === 'string' ? req.query.owner : undefined,
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

  router.get('/ucf-controls/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ucf_control.control.read', res))) return;
    try {
      const row = await getUcfControl(deps.client, {
        tenantSchema: ctx.tenantSchema, controlId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/ucf-controls', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ucf_control.control.write', res))) return;
    try {
      const created = await createUcfControl(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        code: typeof req.body?.code === 'string' ? req.body.code : '',
        objectiveEn: typeof req.body?.objectiveEn === 'string' ? req.body.objectiveEn : null,
        objectiveAr: typeof req.body?.objectiveAr === 'string' ? req.body.objectiveAr : null,
        activityEn: typeof req.body?.activityEn === 'string' ? req.body.activityEn : null,
        activityAr: typeof req.body?.activityAr === 'string' ? req.body.activityAr : null,
        owner: typeof req.body?.owner === 'string' ? req.body.owner : null,
        frequency: typeof req.body?.frequency === 'string' ? req.body.frequency : null,
        evidenceRequirements: arr(req.body?.evidenceRequirements) ?? [],
        testSteps: arr(req.body?.testSteps) ?? [],
        exceptionRules: arr(req.body?.exceptionRules) ?? [],
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'ucf_control.create',
          resourceType: 'ucf_control', resourceId: created.controlId,
          after: { code: created.code, lifecycleState: created.lifecycleState },
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

  router.patch('/ucf-controls/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ucf_control.control.write', res))) return;
    try {
      const before = await getUcfControl(deps.client, {
        tenantSchema: ctx.tenantSchema, controlId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      const updated = await updateUcfControl(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        controlId: req.params.id,
        objectiveEn: typeof req.body?.objectiveEn === 'string' ? req.body.objectiveEn : null,
        objectiveAr: typeof req.body?.objectiveAr === 'string' ? req.body.objectiveAr : null,
        activityEn: typeof req.body?.activityEn === 'string' ? req.body.activityEn : null,
        activityAr: typeof req.body?.activityAr === 'string' ? req.body.activityAr : null,
        owner: typeof req.body?.owner === 'string' ? req.body.owner : null,
        frequency: typeof req.body?.frequency === 'string' ? req.body.frequency : null,
        evidenceRequirements: arr(req.body?.evidenceRequirements),
        testSteps: arr(req.body?.testSteps),
        exceptionRules: arr(req.body?.exceptionRules),
      });
      if (!updated) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'ucf_control.update',
          resourceType: 'ucf_control', resourceId: updated.controlId,
          before: { owner: before.owner, frequency: before.frequency },
          after: { owner: updated.owner, frequency: updated.frequency },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'update_failed', String(err.message));
    }
  });

  router.patch('/ucf-controls/:id/lifecycle', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ucf_control.control.write', res))) return;
    try {
      const before = await getUcfControl(deps.client, {
        tenantSchema: ctx.tenantSchema, controlId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      const updated = await updateUcfLifecycle(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        controlId: req.params.id,
        lifecycleState: typeof req.body?.lifecycleState === 'string'
          ? req.body.lifecycleState as UcfLifecycleState : 'draft',
      });
      if (!updated) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'ucf_control.lifecycle',
          resourceType: 'ucf_control', resourceId: updated.controlId,
          before: { lifecycleState: before.lifecycleState },
          after: { lifecycleState: updated.lifecycleState },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_state') return fail(res, 400, 'bad_state', err.message);
      return fail(res, 500, 'lifecycle_failed', String(err.message));
    }
  });

  router.delete('/ucf-controls/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ucf_control.control.write', res))) return;
    try {
      const before = await getUcfControl(deps.client, {
        tenantSchema: ctx.tenantSchema, controlId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      const removed = await deleteUcfControl(deps.client, {
        tenantSchema: ctx.tenantSchema, controlId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `control ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'ucf_control.delete',
          resourceType: 'ucf_control', resourceId: removed.controlId,
          before: { code: before.code, lifecycleState: before.lifecycleState },
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
