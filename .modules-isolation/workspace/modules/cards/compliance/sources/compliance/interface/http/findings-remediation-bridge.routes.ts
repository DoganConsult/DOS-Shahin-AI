/**
 * Findings → Remediation Bridge REST router (W62) — sub-router on `/api/compliance`.
 *
 *   GET    /findings-remediation-bridge              list (findingId, status, ownerUserId)
 *   GET    /findings-remediation-bridge/:id          single
 *   POST   /findings-remediation-bridge/from-finding bridge: finding -> remediation_action
 *   PATCH  /findings-remediation-bridge/:id/status   transition action status
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listRemediationActions, getRemediationAction, createFromFinding, updateActionStatus,
  type RemediationStatus, type RemediationPriority,
} from '../../application/findings-remediation-bridge/findings-remediation-bridge.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface FindingsRemediationBridgeRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface FindingsRemediationBridgeRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => FindingsRemediationBridgeRouterContext | Promise<FindingsRemediationBridgeRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: FindingsRemediationBridgeRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createFindingsRemediationBridgeRouter(deps: FindingsRemediationBridgeRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('findings_remediation_bridge_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/findings-remediation-bridge', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'remediation.action.read', res))) return;
    try {
      const out = await listRemediationActions(deps.client, {
        tenantSchema: ctx.tenantSchema,
        findingId: typeof req.query.findingId === 'string' ? req.query.findingId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as RemediationStatus : undefined,
        ownerUserId: typeof req.query.ownerUserId === 'string' ? req.query.ownerUserId : undefined,
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

  router.get('/findings-remediation-bridge/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'remediation.action.read', res))) return;
    try {
      const row = await getRemediationAction(deps.client, {
        tenantSchema: ctx.tenantSchema, actionId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `action ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/findings-remediation-bridge/from-finding', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'remediation.action.write', res))) return;
    try {
      const result = await createFromFinding(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        findingId: typeof req.body?.findingId === 'string' ? req.body.findingId : '',
        ownerUserId: typeof req.body?.ownerUserId === 'string' ? req.body.ownerUserId : '',
        plan: typeof req.body?.plan === 'string' ? req.body.plan : '',
        priority: typeof req.body?.priority === 'string' ? req.body.priority as RemediationPriority : undefined,
        dueDate: typeof req.body?.dueDate === 'string' ? req.body.dueDate : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'remediation.action.bridge_from_finding',
          resourceType: 'remediation_action', resourceId: result.action.actionId,
          after: {
            findingId: result.action.findingId,
            ownerUserId: result.action.ownerUserId,
            priority: result.action.priority,
            findingAdvanced: result.findingAdvanced,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_priority') return fail(res, 400, 'bad_priority', err.message);
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      return fail(res, 500, 'bridge_failed', String(err.message));
    }
  });

  router.patch('/findings-remediation-bridge/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'remediation.action.write', res))) return;
    try {
      const updated = await updateActionStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        actionId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as RemediationStatus : 'open',
      });
      if (!updated) return fail(res, 404, 'not_found', `action ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'remediation.action.status',
          resourceType: 'remediation_action', resourceId: updated.actionId,
          after: { status: updated.status, completedAt: updated.completedAt },
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

  return router;
}
