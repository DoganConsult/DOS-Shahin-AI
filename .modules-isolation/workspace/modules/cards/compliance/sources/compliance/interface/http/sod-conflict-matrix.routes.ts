/**
 * SoD-Conflict-Matrix REST router (W46) — sub-router on composite `/api/compliance`.
 *
 *   GET    /sod-conflict-matrix           list (roleA, roleB, conflictType, severity)
 *   GET    /sod-conflict-matrix/:id       single
 *   POST   /sod-conflict-matrix           create
 *   DELETE /sod-conflict-matrix/:id       remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listSodConflicts, getSodConflict,
  createSodConflict, deleteSodConflict,
  type SodConflictType, type SodSeverity,
} from '../../application/sod-conflict-matrix/sod-conflict-matrix.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface SodConflictMatrixRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface SodConflictMatrixRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => SodConflictMatrixRouterContext | Promise<SodConflictMatrixRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: SodConflictMatrixRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createSodConflictMatrixRouter(deps: SodConflictMatrixRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_sod_conflict_matrix_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/sod-conflict-matrix', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sod_conflict.matrix.read', res))) return;
    try {
      const out = await listSodConflicts(deps.client, {
        tenantSchema: ctx.tenantSchema,
        roleA: typeof req.query.roleA === 'string' ? req.query.roleA : undefined,
        roleB: typeof req.query.roleB === 'string' ? req.query.roleB : undefined,
        conflictType: typeof req.query.conflictType === 'string'
          ? req.query.conflictType as SodConflictType : undefined,
        severity: typeof req.query.severity === 'string'
          ? req.query.severity as SodSeverity : undefined,
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

  router.get('/sod-conflict-matrix/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sod_conflict.matrix.read', res))) return;
    try {
      const row = await getSodConflict(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `sod_conflict ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/sod-conflict-matrix', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sod_conflict.matrix.write', res))) return;
    try {
      const created = await createSodConflict(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId, tenantId: ctx.tenantId,
        roleA: typeof req.body?.roleA === 'string' ? req.body.roleA : '',
        roleB: typeof req.body?.roleB === 'string' ? req.body.roleB : '',
        conflictType: typeof req.body?.conflictType === 'string'
          ? req.body.conflictType as SodConflictType : undefined,
        severity: typeof req.body?.severity === 'string'
          ? req.body.severity as SodSeverity : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'sod_conflict.create',
          resourceType: 'sod_conflict', resourceId: created.id,
          after: {
            roleA: created.roleA, roleB: created.roleB,
            conflictType: created.conflictType, severity: created.severity,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_type') return fail(res, 400, 'bad_type', err.message);
      if (err.code === 'bad_severity') return fail(res, 400, 'bad_severity', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.delete('/sod-conflict-matrix/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sod_conflict.matrix.write', res))) return;
    try {
      const before = await getSodConflict(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `sod_conflict ${req.params.id} not found`);
      const removed = await deleteSodConflict(deps.client, {
        tenantSchema: ctx.tenantSchema, id: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `sod_conflict ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'sod_conflict.delete',
          resourceType: 'sod_conflict', resourceId: removed.id,
          before: { roleA: before.roleA, roleB: before.roleB },
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
