/**
 * Control-Effectiveness REST router (W36) — sub-router on composite `/api/compliance`.
 *
 *   GET  /control-effectiveness                                  list (controlId, assessmentType, rating, paging)
 *   GET  /control-effectiveness/latest/:controlId                latest assessment for control (optional ?assessmentType=)
 *   GET  /control-effectiveness/:id                              single
 *   POST /control-effectiveness                                  record new assessment
 *
 * Append-only: no PATCH/DELETE.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listEffectiveness, getEffectiveness, getLatestEffectiveness, createEffectiveness,
  type AssessmentType, type EffectivenessRating,
} from '../../application/control-effectiveness/control-effectiveness.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ControlEffectivenessRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ControlEffectivenessRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ControlEffectivenessRouterContext | Promise<ControlEffectivenessRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ControlEffectivenessRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createControlEffectivenessRouter(deps: ControlEffectivenessRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_control_effectiveness_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/control-effectiveness', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_effectiveness.assessment.read', res))) return;
    try {
      const out = await listEffectiveness(deps.client, {
        tenantSchema: ctx.tenantSchema,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        assessmentType: typeof req.query.assessmentType === 'string'
          ? req.query.assessmentType as AssessmentType : undefined,
        rating: typeof req.query.rating === 'string' ? req.query.rating as EffectivenessRating : undefined,
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

  router.get('/control-effectiveness/latest/:controlId', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_effectiveness.assessment.read', res))) return;
    try {
      const row = await getLatestEffectiveness(deps.client, {
        tenantSchema: ctx.tenantSchema, controlId: req.params.controlId,
        assessmentType: typeof req.query.assessmentType === 'string'
          ? req.query.assessmentType as AssessmentType : undefined,
      });
      if (!row) return fail(res, 404, 'not_found',
        `no assessment for control ${req.params.controlId}`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.get('/control-effectiveness/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_effectiveness.assessment.read', res))) return;
    try {
      const row = await getEffectiveness(deps.client, {
        tenantSchema: ctx.tenantSchema, assessmentId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `assessment ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/control-effectiveness', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_effectiveness.assessment.write', res))) return;
    try {
      const created = await createEffectiveness(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : '',
        assessmentType: typeof req.body?.assessmentType === 'string'
          ? req.body.assessmentType as AssessmentType : undefined,
        rating: typeof req.body?.rating === 'string' ? req.body.rating as EffectivenessRating : undefined,
        evidenceReference: typeof req.body?.evidenceReference === 'string' ? req.body.evidenceReference : null,
        assessedBy: typeof req.body?.assessedBy === 'string' ? req.body.assessedBy : null,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_effectiveness.record',
          resourceType: 'control_effectiveness_assessment', resourceId: created.assessmentId,
          after: { controlId: created.controlId, assessmentType: created.assessmentType, rating: created.rating },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_assessment_type') return fail(res, 400, 'bad_assessment_type', err.message);
      if (err.code === 'bad_rating') return fail(res, 400, 'bad_rating', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  return router;
}
