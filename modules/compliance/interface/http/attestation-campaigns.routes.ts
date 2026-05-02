/**
 * Attestation-Campaigns REST router (W39) — sub-router on composite `/api/compliance`.
 *
 *   GET    /attestation-campaigns                  list (policyId, status, entityType, paging)
 *   GET    /attestation-campaigns/:id              single
 *   POST   /attestation-campaigns                  create (defaults entity_type=framework, status=draft)
 *   PATCH  /attestation-campaigns/:id/status       transition status
 *   DELETE /attestation-campaigns/:id              remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listCampaigns, getCampaign, createCampaign, updateCampaignStatus, deleteCampaign,
  type CampaignEntityType, type CampaignStatus,
} from '../../application/attestation-campaigns/attestation-campaigns.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface AttestationCampaignsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface AttestationCampaignsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => AttestationCampaignsRouterContext | Promise<AttestationCampaignsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: AttestationCampaignsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createAttestationCampaignsRouter(deps: AttestationCampaignsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_attestation_campaigns_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/attestation-campaigns', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_campaign.campaign.read', res))) return;
    try {
      const out = await listCampaigns(deps.client, {
        tenantSchema: ctx.tenantSchema,
        policyId: typeof req.query.policyId === 'string' ? req.query.policyId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as CampaignStatus : undefined,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType as CampaignEntityType : undefined,
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

  router.get('/attestation-campaigns/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_campaign.campaign.read', res))) return;
    try {
      const row = await getCampaign(deps.client, {
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

  router.post('/attestation-campaigns', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_campaign.campaign.write', res))) return;
    try {
      const created = await createCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        policyId: typeof req.body?.policyId === 'string' ? req.body.policyId : null,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType as CampaignEntityType : undefined,
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : null,
        dueDate: typeof req.body?.dueDate === 'string' ? req.body.dueDate : null,
        metadata: typeof req.body?.metadata === 'object' && req.body.metadata !== null
          ? req.body.metadata as Record<string, unknown> : {},
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation_campaign.create',
          resourceType: 'attestation_campaign', resourceId: created.campaignId,
          after: { name: created.name, entityType: created.entityType, status: created.status },
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

  router.patch('/attestation-campaigns/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_campaign.campaign.write', res))) return;
    try {
      const before = await getCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, campaignId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      const updated = await updateCampaignStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        campaignId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as CampaignStatus : 'draft',
      });
      if (!updated) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation_campaign.status',
          resourceType: 'attestation_campaign', resourceId: updated.campaignId,
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

  router.delete('/attestation-campaigns/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation_campaign.campaign.write', res))) return;
    try {
      const before = await getCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, campaignId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      const removed = await deleteCampaign(deps.client, {
        tenantSchema: ctx.tenantSchema, campaignId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `campaign ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation_campaign.delete',
          resourceType: 'attestation_campaign', resourceId: removed.campaignId,
          before: { name: before.name, status: before.status },
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
