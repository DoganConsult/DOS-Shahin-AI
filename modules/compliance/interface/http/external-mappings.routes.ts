/**
 * External-Mappings REST router (W31) — sub-router on composite `/api/compliance`.
 *
 *   GET    /external-mappings              list (entityType, entityId, externalSystem, syncStatus, paging)
 *   GET    /external-mappings/:id          single
 *   POST   /external-mappings              create
 *   PATCH  /external-mappings/:id/sync     record sync (auto-stamp last_synced_at)
 *   DELETE /external-mappings/:id          hard-delete
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listExternalMappings, getExternalMapping, createExternalMapping,
  recordSync, deleteExternalMapping,
  type SyncStatus,
} from '../../application/external-mappings/external-mappings.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ExternalMappingsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ExternalMappingsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ExternalMappingsRouterContext | Promise<ExternalMappingsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ExternalMappingsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createExternalMappingsRouter(deps: ExternalMappingsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_external_mappings_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/external-mappings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'external_mapping.link.read', res))) return;
    try {
      const out = await listExternalMappings(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        externalSystem: typeof req.query.externalSystem === 'string' ? req.query.externalSystem : undefined,
        syncStatus: typeof req.query.syncStatus === 'string' ? req.query.syncStatus as SyncStatus : undefined,
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

  router.get('/external-mappings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'external_mapping.link.read', res))) return;
    try {
      const row = await getExternalMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `external-mapping ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/external-mappings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'external_mapping.link.write', res))) return;
    try {
      const created = await createExternalMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType : '',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : '',
        externalSystem: typeof req.body?.externalSystem === 'string' ? req.body.externalSystem : '',
        externalId: typeof req.body?.externalId === 'string' ? req.body.externalId : '',
        syncStatus: typeof req.body?.syncStatus === 'string' ? req.body.syncStatus as SyncStatus : undefined,
        mappingConfig: req.body?.mappingConfig && typeof req.body.mappingConfig === 'object'
          ? req.body.mappingConfig as Record<string, unknown> : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'external_mapping.create',
          resourceType: 'compliance_external_mapping', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_sync_status') return fail(res, 400, 'bad_sync_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/external-mappings/:id/sync', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'external_mapping.link.write', res))) return;
    try {
      const before = await getExternalMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `external-mapping ${req.params.id} not found`);
      const updated = await recordSync(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id,
        syncStatus: typeof req.body?.syncStatus === 'string' ? req.body.syncStatus as SyncStatus : 'synced',
      });
      if (!updated) return fail(res, 404, 'not_found', `external-mapping ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'external_mapping.sync',
          resourceType: 'compliance_external_mapping', resourceId: updated.id,
          before: { syncStatus: before.syncStatus, lastSyncedAt: before.lastSyncedAt },
          after: { syncStatus: updated.syncStatus, lastSyncedAt: updated.lastSyncedAt },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_sync_status') return fail(res, 400, 'bad_sync_status', err.message);
      return fail(res, 500, 'sync_failed', String(err.message));
    }
  });

  router.delete('/external-mappings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'external_mapping.link.write', res))) return;
    try {
      const before = await getExternalMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `external-mapping ${req.params.id} not found`);
      const removed = await deleteExternalMapping(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `external-mapping ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'external_mapping.delete',
          resourceType: 'compliance_external_mapping', resourceId: removed.id,
          before: before as unknown as Record<string, unknown>,
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
