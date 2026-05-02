/**
 * Approval-Matrix Runtime REST router (W64) — sub-router on `/api/compliance`.
 *
 *   GET    /approval-matrix-runtime              list (entityType, entityId, outcome)
 *   GET    /approval-matrix-runtime/:id          single
 *   POST   /approval-matrix-runtime/resolve      resolve chain → persisted decision
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listDecisions, getDecision, resolveApprovalChain,
  type ApprovalOutcome,
} from '../../application/approval-matrix-runtime/approval-matrix-runtime.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ApprovalMatrixRuntimeRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ApprovalMatrixRuntimeRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ApprovalMatrixRuntimeRouterContext | Promise<ApprovalMatrixRuntimeRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ApprovalMatrixRuntimeRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createApprovalMatrixRuntimeRouter(deps: ApprovalMatrixRuntimeRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('approval_matrix_runtime_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/approval-matrix-runtime', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'approval.decision.read', res))) return;
    try {
      const out = await listDecisions(deps.client, {
        tenantSchema: ctx.tenantSchema,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        outcome: typeof req.query.outcome === 'string' ? req.query.outcome as ApprovalOutcome : undefined,
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

  router.get('/approval-matrix-runtime/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'approval.decision.read', res))) return;
    try {
      const row = await getDecision(deps.client, {
        tenantSchema: ctx.tenantSchema, decisionId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `decision ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/approval-matrix-runtime/resolve', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'approval.decision.write', res))) return;
    try {
      const created = await resolveApprovalChain(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        entityType: typeof req.body?.entityType === 'string' ? req.body.entityType : '',
        entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : '',
        action: typeof req.body?.action === 'string' ? req.body.action : '',
        context: req.body?.context && typeof req.body.context === 'object' ? req.body.context : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'approval.resolve',
          resourceType: 'approval_decision', resourceId: created.decisionId,
          after: {
            entityType: created.entityType, entityId: created.entityId,
            action: created.action, outcome: created.outcome,
            chainLength: created.chain.length,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_outcome') return fail(res, 400, 'bad_outcome', err.message);
      return fail(res, 500, 'resolve_failed', String(err.message));
    }
  });

  return router;
}
