/**
 * Workspaces REST router (W50) — sub-router on composite `/api/compliance`.
 *
 *   GET    /workspaces             list (status, parentWorkspaceId, ownerUserId, search)
 *   GET    /workspaces/:id         single
 *   POST   /workspaces             create
 *   PATCH  /workspaces/:id/status  status transition
 *   DELETE /workspaces/:id         remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listWorkspaces, getWorkspace, createWorkspace,
  updateWorkspaceStatus, deleteWorkspace,
  type WorkspaceStatus,
} from '../../application/workspaces/workspaces.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface WorkspacesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface WorkspacesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => WorkspacesRouterContext | Promise<WorkspacesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: WorkspacesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createWorkspacesRouter(deps: WorkspacesRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_workspaces_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/workspaces', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workspace.workspace.read', res))) return;
    try {
      const out = await listWorkspaces(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as WorkspaceStatus : undefined,
        parentWorkspaceId: typeof req.query.parentWorkspaceId === 'string' ? req.query.parentWorkspaceId : undefined,
        ownerUserId: typeof req.query.ownerUserId === 'string' ? req.query.ownerUserId : undefined,
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

  router.get('/workspaces/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workspace.workspace.read', res))) return;
    try {
      const row = await getWorkspace(deps.client, {
        tenantSchema: ctx.tenantSchema, workspaceId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `workspace ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/workspaces', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workspace.workspace.write', res))) return;
    try {
      const created = await createWorkspace(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        code: typeof req.body?.code === 'string' ? req.body.code : '',
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        description: typeof req.body?.description === 'string' ? req.body.description : undefined,
        status: typeof req.body?.status === 'string' ? req.body.status as WorkspaceStatus : undefined,
        parentWorkspaceId: typeof req.body?.parentWorkspaceId === 'string' ? req.body.parentWorkspaceId : undefined,
        ownerUserId: typeof req.body?.ownerUserId === 'string' ? req.body.ownerUserId : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'workspace.create',
          resourceType: 'workspace', resourceId: created.workspaceId,
          after: { code: created.code, name: created.name, status: created.status },
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

  router.patch('/workspaces/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workspace.workspace.write', res))) return;
    try {
      const before = await getWorkspace(deps.client, {
        tenantSchema: ctx.tenantSchema, workspaceId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `workspace ${req.params.id} not found`);
      const updated = await updateWorkspaceStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        workspaceId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as WorkspaceStatus : '' as WorkspaceStatus,
      });
      if (!updated) return fail(res, 404, 'not_found', `workspace ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'workspace.status',
          resourceType: 'workspace', resourceId: updated.workspaceId,
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

  router.delete('/workspaces/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workspace.workspace.write', res))) return;
    try {
      const before = await getWorkspace(deps.client, {
        tenantSchema: ctx.tenantSchema, workspaceId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `workspace ${req.params.id} not found`);
      const removed = await deleteWorkspace(deps.client, {
        tenantSchema: ctx.tenantSchema, workspaceId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `workspace ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'workspace.delete',
          resourceType: 'workspace', resourceId: removed.workspaceId,
          before: { code: before.code, name: before.name },
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
