/**
 * Bilingual-Content REST router (W55) — sub-router on `/api/compliance`.
 *
 *   GET    /bilingual-content             list (entityType, entityId, fieldKey, language, status)
 *   GET    /bilingual-content/:id         single
 *   POST   /bilingual-content             create
 *   PATCH  /bilingual-content/:id/status  status transition (auto-stamps approved_by/at on `approved`)
 *   DELETE /bilingual-content/:id         remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listBilingualContent, getBilingualContent,
  createBilingualContent, updateBilingualContentStatus, deleteBilingualContent,
  type ContentLanguage, type ContentStatus,
} from '../../application/bilingual-content/bilingual-content.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface BilingualContentRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface BilingualContentRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => BilingualContentRouterContext | Promise<BilingualContentRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: BilingualContentRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createBilingualContentRouter(deps: BilingualContentRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_bilingual_content_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/bilingual-content', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'bilingual_content.content.read', res))) return;
    try {
      const out = await listBilingualContent(deps.client, {
        tenantSchema: ctx.tenantSchema,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        fieldKey: typeof req.query.fieldKey === 'string' ? req.query.fieldKey : undefined,
        language: typeof req.query.language === 'string' ? req.query.language as ContentLanguage : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as ContentStatus : undefined,
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

  router.get('/bilingual-content/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'bilingual_content.content.read', res))) return;
    try {
      const row = await getBilingualContent(deps.client, {
        tenantSchema: ctx.tenantSchema, contentId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `content ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/bilingual-content', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'bilingual_content.content.write', res))) return;
    try {
      const created = await createBilingualContent(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType : '',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : '',
        fieldKey: typeof req.body?.fieldKey === 'string' ? req.body.fieldKey : '',
        language: typeof req.body?.language === 'string' ? req.body.language as ContentLanguage : '' as ContentLanguage,
        content: typeof req.body?.content === 'string' ? req.body.content : '',
        status: typeof req.body?.status === 'string' ? req.body.status as ContentStatus : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'bilingual_content.create',
          resourceType: 'bilingual_content', resourceId: created.contentId,
          after: {
            entityType: created.entityType, entityId: created.entityId,
            fieldKey: created.fieldKey, language: created.language,
            status: created.status,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_language') return fail(res, 400, 'bad_language', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/bilingual-content/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'bilingual_content.content.write', res))) return;
    try {
      const before = await getBilingualContent(deps.client, {
        tenantSchema: ctx.tenantSchema, contentId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `content ${req.params.id} not found`);
      const updated = await updateBilingualContentStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        contentId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as ContentStatus : '' as ContentStatus,
      });
      if (!updated) return fail(res, 404, 'not_found', `content ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'bilingual_content.status',
          resourceType: 'bilingual_content', resourceId: updated.contentId,
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

  router.delete('/bilingual-content/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'bilingual_content.content.write', res))) return;
    try {
      const before = await getBilingualContent(deps.client, {
        tenantSchema: ctx.tenantSchema, contentId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `content ${req.params.id} not found`);
      const removed = await deleteBilingualContent(deps.client, {
        tenantSchema: ctx.tenantSchema, contentId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `content ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'bilingual_content.delete',
          resourceType: 'bilingual_content', resourceId: removed.contentId,
          before: {
            entityType: before.entityType, entityId: before.entityId,
            fieldKey: before.fieldKey, language: before.language,
          },
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
