/**
 * SoD-Runtime REST router (W61) — sub-router on `/api/compliance`.
 *
 *   GET    /sod-runtime              list (subjectUserId, verdict)
 *   GET    /sod-runtime/:id          single
 *   POST   /sod-runtime/evaluate     evaluate roles → persisted verdict
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listEvaluations, getEvaluation, evaluateSod,
  type SodVerdict,
} from '../../application/sod-runtime/sod-runtime.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface SodRuntimeRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface SodRuntimeRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => SodRuntimeRouterContext | Promise<SodRuntimeRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: SodRuntimeRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createSodRuntimeRouter(deps: SodRuntimeRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('sod_runtime_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/sod-runtime', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sod.evaluation.read', res))) return;
    try {
      const out = await listEvaluations(deps.client, {
        tenantSchema: ctx.tenantSchema,
        subjectUserId: typeof req.query.subjectUserId === 'string' ? req.query.subjectUserId : undefined,
        verdict: typeof req.query.verdict === 'string' ? req.query.verdict as SodVerdict : undefined,
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

  router.get('/sod-runtime/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sod.evaluation.read', res))) return;
    try {
      const row = await getEvaluation(deps.client, {
        tenantSchema: ctx.tenantSchema, evaluationId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `evaluation ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/sod-runtime/evaluate', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'sod.evaluation.write', res))) return;
    try {
      const created = await evaluateSod(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        subjectUserId: typeof req.body?.subjectUserId === 'string' ? req.body.subjectUserId : '',
        candidateRoles: Array.isArray(req.body?.candidateRoles) ? req.body.candidateRoles : [],
        context: req.body?.context && typeof req.body.context === 'object' ? req.body.context : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'sod.evaluate',
          resourceType: 'sod_evaluation', resourceId: created.evaluationId,
          after: {
            subjectUserId: created.subjectUserId,
            verdict: created.verdict,
            hitCount: created.hits.length,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_verdict') return fail(res, 400, 'bad_verdict', err.message);
      return fail(res, 500, 'evaluate_failed', String(err.message));
    }
  });

  return router;
}
