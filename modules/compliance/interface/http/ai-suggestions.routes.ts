/**
 * AI-Suggestions REST router (W33) — sub-router on composite `/api/compliance`.
 *
 *   GET   /ai-suggestions                  list (entityType, entityId, suggestionType, status, paging)
 *   GET   /ai-suggestions/:id              single
 *   POST  /ai-suggestions                  create suggestion (typically by AI worker)
 *   PATCH /ai-suggestions/:id/review       record human review (status + reviewer + timestamp)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listAiSuggestions, getAiSuggestion, createAiSuggestion, reviewSuggestion,
  type SuggestionStatus,
} from '../../application/ai-suggestions/ai-suggestions.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface AiSuggestionsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface AiSuggestionsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => AiSuggestionsRouterContext | Promise<AiSuggestionsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: AiSuggestionsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createAiSuggestionsRouter(deps: AiSuggestionsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_ai_suggestions_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/ai-suggestions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ai_suggestion.recommendation.read', res))) return;
    try {
      const out = await listAiSuggestions(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        suggestionType: typeof req.query.suggestionType === 'string' ? req.query.suggestionType : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as SuggestionStatus : undefined,
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

  router.get('/ai-suggestions/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ai_suggestion.recommendation.read', res))) return;
    try {
      const row = await getAiSuggestion(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `ai-suggestion ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/ai-suggestions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ai_suggestion.recommendation.write', res))) return;
    try {
      const created = await createAiSuggestion(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType : '',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : null,
        suggestionType: typeof req.body?.suggestionType === 'string' ? req.body.suggestionType : '',
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        confidence: typeof req.body?.confidence === 'number' ? req.body.confidence : null,
        modelUsed: typeof req.body?.modelUsed === 'string' ? req.body.modelUsed : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'ai_suggestion.create',
          resourceType: 'compliance_ai_suggestion', resourceId: created.id,
          after: { id: created.id, suggestionType: created.suggestionType, title: created.title },
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

  router.patch('/ai-suggestions/:id/review', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'ai_suggestion.recommendation.write', res))) return;
    try {
      const before = await getAiSuggestion(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `ai-suggestion ${req.params.id} not found`);
      const updated = await reviewSuggestion(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as SuggestionStatus : 'pending',
      });
      if (!updated) return fail(res, 404, 'not_found', `ai-suggestion ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'ai_suggestion.review',
          resourceType: 'compliance_ai_suggestion', resourceId: updated.id,
          before: { status: before.status, reviewedBy: before.reviewedBy },
          after: { status: updated.status, reviewedBy: updated.reviewedBy, reviewedAt: updated.reviewedAt },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'review_failed', String(err.message));
    }
  });

  return router;
}
