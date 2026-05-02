/**
 * Drift-Detector REST router (W59) — sub-router on `/api/compliance`.
 *
 *   GET    /drift-detector              list (packCode, entityType, driftKind)
 *   POST   /drift-detector/run          compute deltas vs supplied baseline
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listDriftRecords, runDriftDetection,
  type DriftEntityType, type DriftKind, type DriftBaseline,
} from '../../application/drift-detector/drift-detector.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface DriftDetectorRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface DriftDetectorRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => DriftDetectorRouterContext | Promise<DriftDetectorRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: DriftDetectorRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createDriftDetectorRouter(deps: DriftDetectorRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('drift_detector_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/drift-detector', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'drift.record.read', res))) return;
    try {
      const out = await listDriftRecords(deps.client, {
        tenantSchema: ctx.tenantSchema,
        packCode: typeof req.query.packCode === 'string' ? req.query.packCode : undefined,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType as DriftEntityType : undefined,
        driftKind: typeof req.query.driftKind === 'string' ? req.query.driftKind as DriftKind : undefined,
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

  router.post('/drift-detector/run', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'drift.record.write', res))) return;
    try {
      const baseline = req.body?.baseline as DriftBaseline | undefined;
      if (!baseline || typeof baseline !== 'object') {
        return fail(res, 400, 'bad_input', 'baseline object required');
      }
      const safeBaseline: DriftBaseline = {
        packCode: typeof baseline.packCode === 'string' ? baseline.packCode : '',
        packVersion: typeof baseline.packVersion === 'string' ? baseline.packVersion : '',
        frameworks: Array.isArray(baseline.frameworks) ? baseline.frameworks : [],
        requirements: Array.isArray(baseline.requirements) ? baseline.requirements : [],
      };
      const result = await runDriftDetection(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId, baseline: safeBaseline,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'drift.run',
          resourceType: 'drift_record', resourceId: safeBaseline.packCode,
          after: { packCode: safeBaseline.packCode, inserted: result.inserted },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: { inserted: result.inserted, deltas: result.deltas } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'run_failed', String(err.message));
    }
  });

  return router;
}
