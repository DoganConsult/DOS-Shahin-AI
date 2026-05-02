/**
 * Comments REST router (W28) — sub-router on composite `/api/compliance`.
 *
 *   GET   /comments                 list (entityType, entityId, authorId, isResolved, paging)
 *   GET   /comments/:id             single
 *   POST  /comments                 create
 *   PATCH /comments/:id/resolve     toggle is_resolved
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listComments, getComment, createComment, resolveComment,
} from '../../application/comments/comments.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface CommentsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface CommentsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => CommentsRouterContext | Promise<CommentsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: CommentsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

const parseBool = (q: unknown): boolean | undefined => {
  if (q === 'true') return true;
  if (q === 'false') return false;
  return undefined;
};

export function createCommentsRouter(deps: CommentsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_comments_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/comments', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'comment.thread.read', res))) return;
    try {
      const out = await listComments(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        authorId: typeof req.query.authorId === 'string' ? req.query.authorId : undefined,
        isResolved: parseBool(req.query.isResolved),
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

  router.get('/comments/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'comment.thread.read', res))) return;
    try {
      const row = await getComment(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `comment ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/comments', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'comment.thread.write', res))) return;
    try {
      const created = await createComment(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType : '',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : '',
        content: typeof req.body?.content === 'string' ? req.body.content : '',
        parentId: typeof req.body?.parentId === 'string' ? req.body.parentId : null,
        isInternal: typeof req.body?.isInternal === 'boolean' ? req.body.isInternal : false,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'comment.create',
          resourceType: 'compliance_comment', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
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

  router.patch('/comments/:id/resolve', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'comment.thread.write', res))) return;
    try {
      const isResolved = typeof req.body?.isResolved === 'boolean' ? req.body.isResolved : true;
      const before = await getComment(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `comment ${req.params.id} not found`);
      const updated = await resolveComment(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, isResolved,
      });
      if (!updated) return fail(res, 404, 'not_found', `comment ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'comment.resolve',
          resourceType: 'compliance_comment', resourceId: updated.id,
          before: { isResolved: before.isResolved },
          after: { isResolved: updated.isResolved },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'resolve_failed', String(err.message));
    }
  });

  return router;
}
