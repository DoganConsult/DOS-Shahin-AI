/**
 * Gaps REST router (W14) — mounts under composite `/api/compliance`.
 *
 *   GET   /gaps                    list (assessmentId, requirementId, gapStatus, complianceLevel, ownerId, paging)
 *   GET   /gaps/:id                single
 *   POST  /gaps                    create
 *   PATCH /gaps/:id/status         transition gap_status (and optional compliance_level)
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listGaps, getGap, createGap, updateGapStatus,
} from '../../application/gaps/gaps.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface GapsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface GapsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => GapsRouterContext | Promise<GapsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: GapsRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createGapsRouter(deps: GapsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_gaps_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/gaps', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'gap.record.read', res))) return;
    try {
      const out = await listGaps(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        assessmentId: typeof req.query.assessmentId === 'string' ? req.query.assessmentId : undefined,
        requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : undefined,
        gapStatus: typeof req.query.gapStatus === 'string' ? (req.query.gapStatus as never) : undefined,
        complianceLevel: typeof req.query.complianceLevel === 'string' ? (req.query.complianceLevel as never) : undefined,
        ownerId: typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_level') return fail(res, 400, 'bad_level', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/gaps/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'gap.record.read', res))) return;
    try {
      const row = await getGap(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `gap ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/gaps', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'gap.record.write', res))) return;
    try {
      const created = await createGap(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        assessmentId: typeof req.body?.assessmentId === 'string' ? req.body.assessmentId : '',
        requirementId: typeof req.body?.requirementId === 'string' ? req.body.requirementId : '',
        gapStatus: typeof req.body?.gapStatus === 'string' ? (req.body.gapStatus as never) : undefined,
        complianceLevel: typeof req.body?.complianceLevel === 'string' ? (req.body.complianceLevel as never) : undefined,
        findingText: typeof req.body?.findingText === 'string' ? req.body.findingText : null,
        remediationPlan: typeof req.body?.remediationPlan === 'string' ? req.body.remediationPlan : null,
        dueDate: typeof req.body?.dueDate === 'string' ? req.body.dueDate : null,
        ownerId: typeof req.body?.ownerId === 'string' ? req.body.ownerId : null,
        evidenceRefs: Array.isArray(req.body?.evidenceRefs) ? req.body.evidenceRefs : [],
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'gap.create',
          resourceType: 'compliance_gap', resourceId: created.id,
          after: created as unknown as Record<string, unknown>,
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_level') return fail(res, 400, 'bad_level', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/gaps/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'gap.record.write', res))) return;
    try {
      const gapStatus = typeof req.body?.gapStatus === 'string' ? req.body.gapStatus : '';
      const complianceLevel = typeof req.body?.complianceLevel === 'string' ? req.body.complianceLevel : null;
      const before = await getGap(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `gap ${req.params.id} not found`);
      const updated = await updateGapStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, gapStatus: gapStatus as never,
        complianceLevel: complianceLevel as never,
      });
      if (!updated) return fail(res, 404, 'not_found', `gap ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'gap.status_change',
          resourceType: 'compliance_gap', resourceId: updated.id,
          before: { gapStatus: before.gapStatus, complianceLevel: before.complianceLevel },
          after: { gapStatus: updated.gapStatus, complianceLevel: updated.complianceLevel },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      if (err.code === 'bad_level') return fail(res, 400, 'bad_level', err.message);
      return fail(res, 500, 'update_failed', String(err.message));
    }
  });

  return router;
}
