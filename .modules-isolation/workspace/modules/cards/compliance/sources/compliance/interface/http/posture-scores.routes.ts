/**
 * Posture Scores REST router (W20) — sub-router on composite `/api/compliance`.
 *
 *   GET   /posture-scores               list (frameworkId, period, latest=true, paging)
 *   GET   /posture-scores/:id           single snapshot
 *   POST  /posture-scores               record a new snapshot (immutable)
 *
 * Snapshots are append-only — there is no PATCH/PUT endpoint.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listPostureScores, getPostureScore, recordPostureScore,
} from '../../application/posture-scores/posture-scores.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface PostureScoresRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface PostureScoresRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => PostureScoresRouterContext | Promise<PostureScoresRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: PostureScoresRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createPostureScoresRouter(deps: PostureScoresRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_posture_scores_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/posture-scores', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'posture_score.record.read', res))) return;
    try {
      const out = await listPostureScores(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        frameworkId: typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined,
        period: typeof req.query.period === 'string' ? req.query.period : undefined,
        latestPerFramework: req.query.latest === 'true',
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

  router.get('/posture-scores/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'posture_score.record.read', res))) return;
    try {
      const row = await getPostureScore(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `posture-score ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/posture-scores', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'posture_score.record.write', res))) return;
    try {
      const created = await recordPostureScore(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        frameworkId: typeof req.body?.frameworkId === 'string' ? req.body.frameworkId : '',
        score: typeof req.body?.score === 'number' ? req.body.score : NaN,
        totalRequirements: typeof req.body?.totalRequirements === 'number' ? req.body.totalRequirements : 0,
        compliant: typeof req.body?.compliant === 'number' ? req.body.compliant : 0,
        partiallyCompliant: typeof req.body?.partiallyCompliant === 'number' ? req.body.partiallyCompliant : 0,
        nonCompliant: typeof req.body?.nonCompliant === 'number' ? req.body.nonCompliant : 0,
        notApplicable: typeof req.body?.notApplicable === 'number' ? req.body.notApplicable : 0,
        period: typeof req.body?.period === 'string' ? req.body.period : null,
        computedAt: typeof req.body?.computedAt === 'string' ? req.body.computedAt : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'posture_score.record',
          resourceType: 'compliance_posture_score', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'record_failed', String(err.message));
    }
  });

  return router;
}
