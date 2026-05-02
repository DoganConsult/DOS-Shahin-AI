/**
 * Schema-Migration-Tracker REST router (W72) — sub-router on `/api/compliance`.
 *
 *   GET  /schema-migration-tracker            list (status/sinceVersion filters)
 *   GET  /schema-migration-tracker/:id        fetch one
 *   POST /schema-migration-tracker            record a migration
 *   POST /schema-migration-tracker/:id/rollback  mark rolled_back
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  recordMigration, getMigration, listMigrations, rollbackMigration,
  type MigrationStatus,
} from '../../application/schema-migration-tracker/schema-migration-tracker.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface SchemaMigrationTrackerRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface SchemaMigrationTrackerRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => SchemaMigrationTrackerRouterContext | Promise<SchemaMigrationTrackerRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: SchemaMigrationTrackerRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createSchemaMigrationTrackerRouter(
  deps: SchemaMigrationTrackerRouterDeps,
): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('schema_migration_tracker_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/schema-migration-tracker', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'schema.migration.read', res))) return;
    try {
      const out = await listMigrations(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as MigrationStatus : undefined,
        sinceVersion: req.query.sinceVersion ? Number(req.query.sinceVersion) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total, latestVersion: out.latestVersion } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/schema-migration-tracker/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'schema.migration.read', res))) return;
    try {
      const row = await getMigration(deps.client, {
        tenantSchema: ctx.tenantSchema, migrationId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `migration ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/schema-migration-tracker', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'schema.migration.write', res))) return;
    try {
      const row = await recordMigration(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        migrationId: String(req.body?.migrationId ?? ''),
        version: Number(req.body?.version),
        checksum: String(req.body?.checksum ?? ''),
        status: req.body?.status as MigrationStatus | undefined,
        durationMs: req.body?.durationMs !== undefined ? Number(req.body.durationMs) : undefined,
        error: req.body?.error,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'schema.migration.record',
          resourceType: 'schema_migration', resourceId: row.migrationId,
          after: { version: row.version, status: row.status, checksum: row.checksum },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_checksum') return fail(res, 409, 'bad_checksum', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'record_failed', String(err.message));
    }
  });

  router.post('/schema-migration-tracker/:id/rollback', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'schema.migration.write', res))) return;
    try {
      const row = await rollbackMigration(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        migrationId: req.params.id,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'schema.migration.rollback',
          resourceType: 'schema_migration', resourceId: row.migrationId,
          after: { status: row.status },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_state') return fail(res, 409, 'bad_state', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'rollback_failed', String(err.message));
    }
  });

  return router;
}
