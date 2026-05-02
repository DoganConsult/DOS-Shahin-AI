/**
 * Assessments REST router (W12) — mounts under composite `/api/compliance`.
 *
 *   GET   /assessments              list (status, frameworkId, paging)
 *   GET   /assessments/:id          single
 *   POST  /assessments              create
 *   PATCH /assessments/:id/status   status + optional overallScore transition
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listAssessments, getAssessment, createAssessment, updateAssessmentStatus,
} from '../../application/assessments/assessments.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface AssessmentsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface AssessmentsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => AssessmentsRouterContext | Promise<AssessmentsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: AssessmentsRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createAssessmentsRouter(deps: AssessmentsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_assessments_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/assessments', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'assessment.record.read', res))) return;
    try {
      const out = await listAssessments(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        frameworkId: typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/assessments/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'assessment.record.read', res))) return;
    try {
      const row = await getAssessment(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `assessment ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/assessments', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'assessment.record.write', res))) return;
    try {
      const created = await createAssessment(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        frameworkId: typeof req.body?.frameworkId === 'string' ? req.body.frameworkId : '',
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
        assessmentDate: typeof req.body?.assessmentDate === 'string' ? req.body.assessmentDate : null,
        scope: typeof req.body?.scope === 'string' ? req.body.scope : null,
        assessorId: typeof req.body?.assessorId === 'string' ? req.body.assessorId : null,
        overallScore: typeof req.body?.overallScore === 'number' ? req.body.overallScore : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'assessment.create',
          resourceType: 'compliance_assessment', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/assessments/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'assessment.record.write', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const overallScore = typeof req.body?.overallScore === 'number' ? req.body.overallScore : null;
      const before = await getAssessment(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `assessment ${req.params.id} not found`);
      const updated = await updateAssessmentStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never, overallScore,
      });
      if (!updated) return fail(res, 404, 'not_found', `assessment ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'assessment.status_change',
          resourceType: 'compliance_assessment', resourceId: updated.id,
          before: { status: before.status, overallScore: before.overallScore },
          after: { status: updated.status, overallScore: updated.overallScore },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      return fail(res, 500, 'update_failed', String(err.message));
    }
  });

  return router;
}
