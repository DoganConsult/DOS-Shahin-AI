/**
 * Compliance-Universe REST router (W56) — sub-router on `/api/compliance`.
 *
 *   GET    /compliance-universe             list (nodeType, parentNodeId, status, search)
 *   GET    /compliance-universe/:id         single
 *   POST   /compliance-universe             create
 *   PATCH  /compliance-universe/:id/status  status transition
 *   DELETE /compliance-universe/:id         remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listUniverseNodes, getUniverseNode,
  createUniverseNode, updateUniverseNodeStatus, deleteUniverseNode,
  type UniverseNodeType, type UniverseNodeStatus,
} from '../../application/compliance-universe/compliance-universe.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ComplianceUniverseRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ComplianceUniverseRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ComplianceUniverseRouterContext | Promise<ComplianceUniverseRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ComplianceUniverseRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createComplianceUniverseRouter(deps: ComplianceUniverseRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_universe_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/compliance-universe', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_universe.node.read', res))) return;
    try {
      const out = await listUniverseNodes(deps.client, {
        tenantSchema: ctx.tenantSchema,
        nodeType: typeof req.query.nodeType === 'string' ? req.query.nodeType as UniverseNodeType : undefined,
        parentNodeId: typeof req.query.parentNodeId === 'string' ? req.query.parentNodeId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as UniverseNodeStatus : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
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

  router.get('/compliance-universe/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_universe.node.read', res))) return;
    try {
      const row = await getUniverseNode(deps.client, {
        tenantSchema: ctx.tenantSchema, nodeId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `node ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/compliance-universe', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_universe.node.write', res))) return;
    try {
      const created = await createUniverseNode(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        nodeType: typeof req.body?.nodeType === 'string' ? req.body.nodeType as UniverseNodeType : '' as UniverseNodeType,
        nodeCode: typeof req.body?.nodeCode === 'string' ? req.body.nodeCode : '',
        label: typeof req.body?.label === 'string' ? req.body.label : '',
        parentNodeId: typeof req.body?.parentNodeId === 'string' ? req.body.parentNodeId : undefined,
        attributes: req.body?.attributes && typeof req.body.attributes === 'object' ? req.body.attributes : undefined,
        status: typeof req.body?.status === 'string' ? req.body.status as UniverseNodeStatus : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'compliance_universe.create',
          resourceType: 'compliance_universe_node', resourceId: created.nodeId,
          after: {
            nodeType: created.nodeType, nodeCode: created.nodeCode, status: created.status,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_node_type') return fail(res, 400, 'bad_node_type', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/compliance-universe/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_universe.node.write', res))) return;
    try {
      const before = await getUniverseNode(deps.client, {
        tenantSchema: ctx.tenantSchema, nodeId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `node ${req.params.id} not found`);
      const updated = await updateUniverseNodeStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        nodeId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as UniverseNodeStatus : '' as UniverseNodeStatus,
      });
      if (!updated) return fail(res, 404, 'not_found', `node ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'compliance_universe.status',
          resourceType: 'compliance_universe_node', resourceId: updated.nodeId,
          before: { status: before.status }, after: { status: updated.status },
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

  router.delete('/compliance-universe/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'compliance_universe.node.write', res))) return;
    try {
      const before = await getUniverseNode(deps.client, {
        tenantSchema: ctx.tenantSchema, nodeId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `node ${req.params.id} not found`);
      const removed = await deleteUniverseNode(deps.client, {
        tenantSchema: ctx.tenantSchema, nodeId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `node ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'compliance_universe.delete',
          resourceType: 'compliance_universe_node', resourceId: removed.nodeId,
          before: { nodeType: before.nodeType, nodeCode: before.nodeCode },
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
