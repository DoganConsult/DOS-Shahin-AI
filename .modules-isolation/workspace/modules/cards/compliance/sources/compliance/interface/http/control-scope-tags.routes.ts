/**
 * Control-Scope-Tags REST router (W37) — sub-router on composite `/api/compliance`.
 *
 *   GET    /control-scope-tags                      list (controlId, scope, inScope, paging)
 *   GET    /control-scope-tags/:id                  single
 *   POST   /control-scope-tags                      upsert by (controlId, scope)
 *   PATCH  /control-scope-tags/:id/sign-off         stamp signed_off_by/at
 *   DELETE /control-scope-tags/:id                  remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listScopeTags, getScopeTag, upsertScopeTag, signOffScopeTag, deleteScopeTag,
} from '../../application/control-scope-tags/control-scope-tags.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ControlScopeTagsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ControlScopeTagsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ControlScopeTagsRouterContext | Promise<ControlScopeTagsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ControlScopeTagsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createControlScopeTagsRouter(deps: ControlScopeTagsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_control_scope_tags_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/control-scope-tags', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_scope_tag.scope.read', res))) return;
    try {
      const out = await listScopeTags(deps.client, {
        tenantSchema: ctx.tenantSchema,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        scope: typeof req.query.scope === 'string' ? req.query.scope : undefined,
        inScope: typeof req.query.inScope === 'string'
          ? req.query.inScope === 'true' : undefined,
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

  router.get('/control-scope-tags/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_scope_tag.scope.read', res))) return;
    try {
      const row = await getScopeTag(deps.client, {
        tenantSchema: ctx.tenantSchema, tagId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `scope-tag ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/control-scope-tags', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_scope_tag.scope.write', res))) return;
    try {
      const created = await upsertScopeTag(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : '',
        scope: typeof req.body?.scope === 'string' ? req.body.scope : '',
        inScope: typeof req.body?.inScope === 'boolean' ? req.body.inScope : undefined,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_scope_tag.upsert',
          resourceType: 'control_scope_tag', resourceId: created.tagId,
          after: { controlId: created.controlId, scope: created.scope, inScope: created.inScope },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'upsert_failed', String(err.message));
    }
  });

  router.patch('/control-scope-tags/:id/sign-off', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_scope_tag.scope.write', res))) return;
    try {
      const before = await getScopeTag(deps.client, {
        tenantSchema: ctx.tenantSchema, tagId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `scope-tag ${req.params.id} not found`);
      const updated = await signOffScopeTag(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        tagId: req.params.id,
        signedOffBy: typeof req.body?.signedOffBy === 'string' ? req.body.signedOffBy : null,
      });
      if (!updated) return fail(res, 404, 'not_found', `scope-tag ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_scope_tag.sign-off',
          resourceType: 'control_scope_tag', resourceId: updated.tagId,
          before: { signedOffBy: before.signedOffBy, signedOffAt: before.signedOffAt },
          after: { signedOffBy: updated.signedOffBy, signedOffAt: updated.signedOffAt },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'sign_off_failed', String(err.message));
    }
  });

  router.delete('/control-scope-tags/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_scope_tag.scope.write', res))) return;
    try {
      const before = await getScopeTag(deps.client, {
        tenantSchema: ctx.tenantSchema, tagId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `scope-tag ${req.params.id} not found`);
      const removed = await deleteScopeTag(deps.client, {
        tenantSchema: ctx.tenantSchema, tagId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `scope-tag ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_scope_tag.delete',
          resourceType: 'control_scope_tag', resourceId: removed.tagId,
          before: { controlId: before.controlId, scope: before.scope, inScope: before.inScope },
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
