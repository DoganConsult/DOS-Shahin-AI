/**
 * Instrument-Structure REST router (W51) — sub-router on `/api/compliance`.
 *
 *   GET    /instrument-structure              list (instrumentCode, nodeType, parentNodeId, language, search)
 *   GET    /instrument-structure/:id          single
 *   POST   /instrument-structure              create node
 *   DELETE /instrument-structure/:id          remove node
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listInstrumentNodes, getInstrumentNode,
  createInstrumentNode, deleteInstrumentNode,
  type InstrumentNodeType,
} from '../../application/instrument-structure/instrument-structure.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface InstrumentStructureRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface InstrumentStructureRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => InstrumentStructureRouterContext | Promise<InstrumentStructureRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: InstrumentStructureRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createInstrumentStructureRouter(deps: InstrumentStructureRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_instrument_structure_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/instrument-structure', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'instrument.node.read', res))) return;
    try {
      const out = await listInstrumentNodes(deps.client, {
        tenantSchema: ctx.tenantSchema,
        instrumentCode: typeof req.query.instrumentCode === 'string' ? req.query.instrumentCode : undefined,
        nodeType: typeof req.query.nodeType === 'string' ? req.query.nodeType as InstrumentNodeType : undefined,
        parentNodeId: typeof req.query.parentNodeId === 'string' ? req.query.parentNodeId : undefined,
        language: typeof req.query.language === 'string' ? req.query.language : undefined,
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

  router.get('/instrument-structure/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'instrument.node.read', res))) return;
    try {
      const row = await getInstrumentNode(deps.client, {
        tenantSchema: ctx.tenantSchema, nodeId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `instrument node ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/instrument-structure', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'instrument.node.write', res))) return;
    try {
      const created = await createInstrumentNode(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        instrumentCode: typeof req.body?.instrumentCode === 'string' ? req.body.instrumentCode : '',
        nodeType: typeof req.body?.nodeType === 'string' ? req.body.nodeType as InstrumentNodeType : '' as InstrumentNodeType,
        parentNodeId: typeof req.body?.parentNodeId === 'string' ? req.body.parentNodeId : undefined,
        label: typeof req.body?.label === 'string' ? req.body.label : '',
        ordinal: typeof req.body?.ordinal === 'number' ? req.body.ordinal : undefined,
        body: typeof req.body?.body === 'string' ? req.body.body : undefined,
        language: typeof req.body?.language === 'string' ? req.body.language : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'instrument_node.create',
          resourceType: 'instrument_node', resourceId: created.nodeId,
          after: {
            instrumentCode: created.instrumentCode,
            nodeType: created.nodeType, label: created.label,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_node_type') return fail(res, 400, 'bad_node_type', err.message);
      if (err.code === 'bad_parent') return fail(res, 400, 'bad_parent', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.delete('/instrument-structure/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'instrument.node.write', res))) return;
    try {
      const before = await getInstrumentNode(deps.client, {
        tenantSchema: ctx.tenantSchema, nodeId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `instrument node ${req.params.id} not found`);
      const removed = await deleteInstrumentNode(deps.client, {
        tenantSchema: ctx.tenantSchema, nodeId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `instrument node ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'instrument_node.delete',
          resourceType: 'instrument_node', resourceId: removed.nodeId,
          before: {
            instrumentCode: before.instrumentCode,
            nodeType: before.nodeType, label: before.label,
          },
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
