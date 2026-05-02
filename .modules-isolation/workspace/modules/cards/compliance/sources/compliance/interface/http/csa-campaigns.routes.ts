/**
 * CSA-Campaigns REST router (W42) — sub-router on composite `/api/compliance`.
 *
 *   GET    /csa-campaigns                  list (status, paging)
 *   GET    /csa-campaigns/:id              single
 *   POST   /csa-campaigns                  create
 *   PATCH  /csa-campaigns/:id/status       transition status
 *   DELETE /csa-campaigns/:id              remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listCsaCampaigns, getCsaCampaign, createCsaCampaign,
  updateCsaCampaignStatus, deleteCsaCampaign,
  type CsaCampaignStatus,
} from '../../application/csa-campaigns/csa-campaigns.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface CsaCampaignsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface CsaCampaignsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => CsaCampaignsRouterContext | Promise<CsaCampaignsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: CsaCampaignsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createCsaCampaignsRouter(deps: CsaCampaignsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_csa_campaigns_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/csa-campaigns', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_campaign.campaign.read', res))) return;
    try {
      const out = await listCsaCampaigns(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as CsaCampaignStatus : undefined,
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

  router.get('/csa-campaigns/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_campaign.campaign.read', res))) return;
    try {
      const row = await getCsaCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, campaignId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/csa-campaigns', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_campaign.campaign.write', res))) return;
    try {
      const created = await createCsaCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        controlIds: Array.isArray(req.body?.controlIds) ? req.body.controlIds as string[] : [],
        respondentIds: Array.isArray(req.body?.respondentIds) ? req.body.respondentIds as string[] : [],
        deadline: typeof req.body?.deadline === 'string' ? req.body.deadline : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'csa_campaign.create',
          resourceType: 'csa_campaign', resourceId: created.campaignId,
          after: { title: created.title, status: created.status },
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

  router.patch('/csa-campaigns/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_campaign.campaign.write', res))) return;
    try {
      const before = await getCsaCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, campaignId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      const updated = await updateCsaCampaignStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        campaignId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as CsaCampaignStatus : 'draft',
      });
      if (!updated) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'csa_campaign.status',
          resourceType: 'csa_campaign', resourceId: updated.campaignId,
          before: { status: before.status },
          after: { status: updated.status },
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

  router.delete('/csa-campaigns/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_campaign.campaign.write', res))) return;
    try {
      const before = await getCsaCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, campaignId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      const removed = await deleteCsaCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, campaignId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'csa_campaign.delete',
          resourceType: 'csa_campaign', resourceId: removed.campaignId,
          before: { title: before.title, status: before.status },
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
