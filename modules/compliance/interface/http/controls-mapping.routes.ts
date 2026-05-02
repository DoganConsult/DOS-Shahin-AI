/**
 * Controls Mapping REST router (W24) — sub-router on composite `/api/compliance`.
 *
 *   GET   /controls-mapping                list (requirementId, controlId, mappingStatus, effectiveness, paging)
 *   GET   /controls-mapping/:id            single
 *   POST  /controls-mapping                create
 *   PATCH /controls-mapping/:id/test       record test (effectiveness + last/next test dates + tester)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listControlsMapping, getControlMapping,
  createControlMapping, recordControlTest,
} from '../../application/controls-mapping/controls-mapping.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ControlsMappingRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ControlsMappingRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ControlsMappingRouterContext | Promise<ControlsMappingRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ControlsMappingRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createControlsMappingRouter(deps: ControlsMappingRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_controls_mapping_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/controls-mapping', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'controls_mapping.record.read', res))) return;
    try {
      const out = await listControlsMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : undefined,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        mappingStatus: typeof req.query.mappingStatus === 'string' ? (req.query.mappingStatus as never) : undefined,
        effectiveness: typeof req.query.effectiveness === 'string' ? (req.query.effectiveness as never) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_effectiveness') return fail(res, 400, 'bad_effectiveness', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/controls-mapping/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'controls_mapping.record.read', res))) return;
    try {
      const row = await getControlMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `controls_mapping ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/controls-mapping', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'controls_mapping.record.write', res))) return;
    try {
      const created = await createControlMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        requirementId: typeof req.body?.requirementId === 'string' ? req.body.requirementId : '',
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : '',
        mappingStatus: typeof req.body?.mappingStatus === 'string' ? (req.body.mappingStatus as never) : undefined,
        effectiveness: typeof req.body?.effectiveness === 'string' ? (req.body.effectiveness as never) : undefined,
        lastTested: typeof req.body?.lastTested === 'string' ? req.body.lastTested : null,
        nextTestDate: typeof req.body?.nextTestDate === 'string' ? req.body.nextTestDate : null,
        testerId: typeof req.body?.testerId === 'string' ? req.body.testerId : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'controls_mapping.create',
          resourceType: 'compliance_controls_mapping', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_effectiveness') return fail(res, 400, 'bad_effectiveness', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/controls-mapping/:id/test', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'controls_mapping.record.write', res))) return;
    try {
      const effectiveness = typeof req.body?.effectiveness === 'string' ? req.body.effectiveness : '';
      const lastTested = typeof req.body?.lastTested === 'string' ? req.body.lastTested : null;
      const nextTestDate = typeof req.body?.nextTestDate === 'string' ? req.body.nextTestDate : null;
      const testerId = typeof req.body?.testerId === 'string' ? req.body.testerId : null;
      const before = await getControlMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `controls_mapping ${req.params.id} not found`);
      const updated = await recordControlTest(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, effectiveness: effectiveness as never,
        lastTested, nextTestDate, testerId,
      });
      if (!updated) return fail(res, 404, 'not_found', `controls_mapping ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'controls_mapping.test',
          resourceType: 'compliance_controls_mapping', resourceId: updated.id,
          before: { effectiveness: before.effectiveness, lastTested: before.lastTested },
          after: { effectiveness: updated.effectiveness, lastTested: updated.lastTested },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_effectiveness') return fail(res, 400, 'bad_effectiveness', err.message);
      return fail(res, 500, 'test_failed', String(err.message));
    }
  });

  return router;
}
