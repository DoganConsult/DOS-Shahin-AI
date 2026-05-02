/**
 * CSA-Responses REST router (W43) — sub-router on composite `/api/compliance`.
 *
 *   GET    /csa-responses        list (campaignId, controlId, respondent, effectivenessRating)
 *   GET    /csa-responses/:id    single
 *   POST   /csa-responses        create (append-only)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listCsaResponses, getCsaResponse, createCsaResponse,
  type CsaEffectivenessRating,
} from '../../application/csa-responses/csa-responses.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface CsaResponsesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface CsaResponsesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => CsaResponsesRouterContext | Promise<CsaResponsesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: CsaResponsesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createCsaResponsesRouter(deps: CsaResponsesRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_csa_responses_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/csa-responses', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_response.response.read', res))) return;
    try {
      const out = await listCsaResponses(deps.client, {
        tenantSchema: ctx.tenantSchema,
        campaignId: typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        respondent: typeof req.query.respondent === 'string' ? req.query.respondent : undefined,
        effectivenessRating: typeof req.query.effectivenessRating === 'string'
          ? req.query.effectivenessRating as CsaEffectivenessRating : undefined,
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

  router.get('/csa-responses/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_response.response.read', res))) return;
    try {
      const row = await getCsaResponse(deps.client, {
        tenantSchema: ctx.tenantSchema, responseId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `response ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/csa-responses', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'csa_response.response.write', res))) return;
    try {
      const created = await createCsaResponse(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        campaignId: typeof req.body?.campaignId === 'string' ? req.body.campaignId : '',
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : '',
        respondent: typeof req.body?.respondent === 'string' ? req.body.respondent : undefined,
        effectivenessRating: typeof req.body?.effectivenessRating === 'string'
          ? req.body.effectivenessRating as CsaEffectivenessRating : undefined,
        designAdequate: typeof req.body?.designAdequate === 'boolean' ? req.body.designAdequate : null,
        operatingEffective: typeof req.body?.operatingEffective === 'boolean' ? req.body.operatingEffective : null,
        evidenceAvailable: typeof req.body?.evidenceAvailable === 'boolean' ? req.body.evidenceAvailable : null,
        comments: typeof req.body?.comments === 'string' ? req.body.comments : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'csa_response.submit',
          resourceType: 'csa_response', resourceId: created.responseId,
          after: {
            campaignId: created.campaignId, controlId: created.controlId,
            effectivenessRating: created.effectivenessRating,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_rating') return fail(res, 400, 'bad_rating', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  return router;
}
