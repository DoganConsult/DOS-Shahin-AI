/**
 * Entities REST router (W47) — sub-router on composite `/api/compliance`.
 *
 *   GET    /entities              list (entityType, status, search)
 *   GET    /entities/:id          single
 *   POST   /entities              create
 *   PATCH  /entities/:id/status   status transition
 *   DELETE /entities/:id          remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listEntities, getEntity, createEntity,
  updateEntityStatus, deleteEntity,
  type EntityType, type EntityStatus,
} from '../../application/entities/entities.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface EntitiesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface EntitiesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => EntitiesRouterContext | Promise<EntitiesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: EntitiesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createEntitiesRouter(deps: EntitiesRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_entities_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/entities', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'entity.entity.read', res))) return;
    try {
      const out = await listEntities(deps.client, {
        tenantSchema: ctx.tenantSchema,
        entityType: typeof req.query.entityType === 'string'
          ? req.query.entityType as EntityType : undefined,
        status: typeof req.query.status === 'string'
          ? req.query.status as EntityStatus : undefined,
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

  router.get('/entities/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'entity.entity.read', res))) return;
    try {
      const row = await getEntity(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `entity ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/entities', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'entity.entity.write', res))) return;
    try {
      const created = await createEntity(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId, tenantId: ctx.tenantId,
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        entityType: typeof req.body?.entityType === 'string'
          ? req.body.entityType as EntityType : undefined,
        status: typeof req.body?.status === 'string'
          ? req.body.status as EntityStatus : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'entity.create',
          resourceType: 'entity', resourceId: created.id,
          after: { name: created.name, entityType: created.entityType, status: created.status },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_type') return fail(res, 400, 'bad_type', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/entities/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'entity.entity.write', res))) return;
    try {
      const before = await getEntity(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `entity ${req.params.id} not found`);
      const updated = await updateEntityStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        id: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as EntityStatus : '' as EntityStatus,
      });
      if (!updated) return fail(res, 404, 'not_found', `entity ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'entity.status',
          resourceType: 'entity', resourceId: updated.id,
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

  router.delete('/entities/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'entity.entity.write', res))) return;
    try {
      const before = await getEntity(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `entity ${req.params.id} not found`);
      const removed = await deleteEntity(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `entity ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'entity.delete',
          resourceType: 'entity', resourceId: removed.id,
          before: { name: before.name, entityType: before.entityType },
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
