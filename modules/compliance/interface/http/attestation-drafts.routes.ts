/**
 * Attestation-Drafts REST router (W41) — sub-router on composite `/api/compliance`.
 *
 *   GET    /attestation-drafts                  list (entityType, entityId, status, paging)
 *   GET    /attestation-drafts/:id              single
 *   POST   /attestation-drafts                  create
 *   PATCH  /attestation-drafts/:id/review       review (approved/rejected stamps approved_by/at)
 *   DELETE /attestation-drafts/:id              remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listDrafts, getDraft, createDraft, reviewDraft, deleteDraft,
  type DraftEntityType, type DraftStatus,
} from '../../application/attestation-drafts/attestation-drafts.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface AttestationDraftsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface AttestationDraftsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => AttestationDraftsRouterContext | Promise<AttestationDraftsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: AttestationDraftsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createAttestationDraftsRouter(deps: AttestationDraftsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_attestation_drafts_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/attestation-drafts', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_draft.draft.read', res))) return;
    try {
      const out = await listDrafts(deps.client, {
        tenantSchema: ctx.tenantSchema,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType as DraftEntityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as DraftStatus : undefined,
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

  router.get('/attestation-drafts/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_draft.draft.read', res))) return;
    try {
      const row = await getDraft(deps.client, {
        tenantSchema: ctx.tenantSchema, draftId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `draft ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/attestation-drafts', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_draft.draft.write', res))) return;
    try {
      const created = await createDraft(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType as DraftEntityType : 'framework',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : '',
        entityName: typeof req.body?.entityName === 'string' ? req.body.entityName : '',
        readinessScore: typeof req.body?.readinessScore === 'object' && req.body.readinessScore !== null
          ? req.body.readinessScore as Record<string, unknown> : {},
        content: typeof req.body?.content === 'object' && req.body.content !== null
          ? req.body.content as Record<string, unknown> : {},
        expiresAt: typeof req.body?.expiresAt === 'string' ? req.body.expiresAt : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation_draft.create',
          resourceType: 'attestation_draft', resourceId: created.draftId,
          after: { entityType: created.entityType, entityId: created.entityId, status: created.status },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_entity_type') return fail(res, 400, 'bad_entity_type', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/attestation-drafts/:id/review', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_draft.draft.write', res))) return;
    try {
      const before = await getDraft(deps.client, {
        tenantSchema: ctx.tenantSchema, draftId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `draft ${req.params.id} not found`);
      const updated = await reviewDraft(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        draftId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as DraftStatus : 'pending_review',
      });
      if (!updated) return fail(res, 404, 'not_found', `draft ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation_draft.review',
          resourceType: 'attestation_draft', resourceId: updated.draftId,
          before: { status: before.status, approvedBy: before.approvedBy },
          after: { status: updated.status, approvedBy: updated.approvedBy, approvedAt: updated.approvedAt },
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

  router.delete('/attestation-drafts/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_draft.draft.write', res))) return;
    try {
      const before = await getDraft(deps.client, {
        tenantSchema: ctx.tenantSchema, draftId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `draft ${req.params.id} not found`);
      const removed = await deleteDraft(deps.client, {
        tenantSchema: ctx.tenantSchema, draftId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `draft ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation_draft.delete',
          resourceType: 'attestation_draft', resourceId: removed.draftId,
          before: { entityType: before.entityType, entityId: before.entityId, status: before.status },
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
