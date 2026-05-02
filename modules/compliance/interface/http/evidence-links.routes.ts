/**
 * Evidence Links REST router (W17) — sub-router on composite `/api/compliance`.
 *
 *   GET   /evidence-links                list (requirementId, evidenceId, linkType, verifiedOnly, paging)
 *   GET   /evidence-links/:id            single
 *   POST  /evidence-links                create
 *   PATCH /evidence-links/:id/verify     verify or clear verification
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listEvidenceLinks, getEvidenceLink, createEvidenceLink, verifyEvidenceLink,
} from '../../application/evidence-links/evidence-links.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface EvidenceLinksRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface EvidenceLinksRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => EvidenceLinksRouterContext | Promise<EvidenceLinksRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: EvidenceLinksRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

const parseVerifiedOnly = (q: unknown): boolean | undefined => {
  if (q === 'true') return true;
  if (q === 'false') return false;
  return undefined;
};

export function createEvidenceLinksRouter(deps: EvidenceLinksRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_evidence_links_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/evidence-links', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence.link.read', res))) return;
    try {
      const out = await listEvidenceLinks(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : undefined,
        evidenceId: typeof req.query.evidenceId === 'string' ? req.query.evidenceId : undefined,
        linkType: typeof req.query.linkType === 'string' ? (req.query.linkType as never) : undefined,
        verifiedOnly: parseVerifiedOnly(req.query.verifiedOnly),
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_link_type') return fail(res, 400, 'bad_link_type', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/evidence-links/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence.link.read', res))) return;
    try {
      const row = await getEvidenceLink(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `evidence-link ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/evidence-links', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence.link.write', res))) return;
    try {
      const created = await createEvidenceLink(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        requirementId: typeof req.body?.requirementId === 'string' ? req.body.requirementId : '',
        evidenceId: typeof req.body?.evidenceId === 'string' ? req.body.evidenceId : '',
        linkType: typeof req.body?.linkType === 'string' ? (req.body.linkType as never) : undefined,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'evidence_link.create',
          resourceType: 'compliance_evidence_link', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_link_type') return fail(res, 400, 'bad_link_type', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/evidence-links/:id/verify', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence.link.write', res))) return;
    try {
      const verified = req.body?.verified !== false;
      const verifiedBy = typeof req.body?.verifiedBy === 'string' ? req.body.verifiedBy : undefined;
      const notes = typeof req.body?.notes === 'string' ? req.body.notes : null;
      const before = await getEvidenceLink(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `evidence-link ${req.params.id} not found`);
      const updated = await verifyEvidenceLink(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, verified, verifiedBy, notes,
      });
      if (!updated) return fail(res, 404, 'not_found', `evidence-link ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'evidence_link.verify',
          resourceType: 'compliance_evidence_link', resourceId: updated.id,
          before: { verifiedAt: before.verifiedAt, verifiedBy: before.verifiedBy },
          after: { verifiedAt: updated.verifiedAt, verifiedBy: updated.verifiedBy },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'verify_failed', String(err.message));
    }
  });

  return router;
}
