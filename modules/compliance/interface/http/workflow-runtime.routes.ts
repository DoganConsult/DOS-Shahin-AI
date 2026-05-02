/**
 * Workflow-Runtime REST router (W70) — sub-router on `/api/compliance`.
 *
 *   GET  /workflow-runtime/definitions             list (filter by workflowCode)
 *   POST /workflow-runtime/definitions             register a definition
 *   GET  /workflow-runtime/instances               list (filters)
 *   GET  /workflow-runtime/instances/:id           fetch
 *   POST /workflow-runtime/instances               start an instance
 *   POST /workflow-runtime/instances/:id/trigger   trigger a transition
 *   POST /workflow-runtime/instances/:id/terminate terminate
 *   GET  /workflow-runtime/instances/:id/transitions  history
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  createDefinition, listDefinitions,
  startInstance, getInstance, listInstances, listTransitions,
  triggerEvent, terminateInstance,
  type WorkflowStatus,
} from '../../application/workflow-runtime/workflow-runtime.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface WorkflowRuntimeRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
  /** Permissions the actor holds — used for transition.requiresPermission gating. */
  permissions?: string[];
}

export interface WorkflowRuntimeRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => WorkflowRuntimeRouterContext | Promise<WorkflowRuntimeRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: WorkflowRuntimeRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createWorkflowRuntimeRouter(deps: WorkflowRuntimeRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('workflow_runtime_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/workflow-runtime/definitions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.read', res))) return;
    try {
      const out = await listDefinitions(deps.client, {
        tenantSchema: ctx.tenantSchema,
        workflowCode: typeof req.query.workflowCode === 'string' ? req.query.workflowCode : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.post('/workflow-runtime/definitions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.write', res))) return;
    try {
      const row = await createDefinition(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        workflowCode: String(req.body?.workflowCode ?? ''),
        version: req.body?.version ? Number(req.body.version) : undefined,
        definition: req.body?.definition,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'workflow.definition.create',
          resourceType: 'workflow_definition', resourceId: row.definitionId,
          after: { workflowCode: row.workflowCode, version: row.version },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_definition') return fail(res, 400, 'bad_definition', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.get('/workflow-runtime/instances', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.read', res))) return;
    try {
      const out = await listInstances(deps.client, {
        tenantSchema: ctx.tenantSchema,
        workflowCode: typeof req.query.workflowCode === 'string' ? req.query.workflowCode : undefined,
        entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as WorkflowStatus : undefined,
        currentState: typeof req.query.currentState === 'string' ? req.query.currentState : undefined,
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

  router.get('/workflow-runtime/instances/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.read', res))) return;
    try {
      const row = await getInstance(deps.client, {
        tenantSchema: ctx.tenantSchema, instanceId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `instance ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      return fail(res, 500, 'get_failed', String((e as Error).message));
    }
  });

  router.post('/workflow-runtime/instances', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.write', res))) return;
    try {
      const row = await startInstance(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        workflowCode: String(req.body?.workflowCode ?? ''),
        entityType: String(req.body?.entityType ?? ''),
        entityId: String(req.body?.entityId ?? ''),
        context: req.body?.context ?? {},
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'workflow.instance.start',
          resourceType: 'workflow_instance', resourceId: row.instanceId,
          after: {
            workflowCode: row.workflowCode, currentState: row.currentState,
            entityType: row.entityType, entityId: row.entityId,
          },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'start_failed', String(err.message));
    }
  });

  router.post('/workflow-runtime/instances/:id/trigger', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.write', res))) return;
    try {
      const result = await triggerEvent(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        instanceId: req.params.id,
        event: String(req.body?.event ?? ''),
        context: req.body?.context ?? {},
        permissions: ctx.permissions ?? [],
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'workflow.instance.trigger',
          resourceType: 'workflow_instance', resourceId: result.instance.instanceId,
          after: {
            fromState: result.transition.fromState,
            toState: result.transition.toState,
            event: result.transition.event,
          },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: result });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_state') return fail(res, 409, 'bad_state', err.message);
      if (err.code === 'no_transition') return fail(res, 409, 'no_transition', err.message);
      if (err.code === 'forbidden') return fail(res, 403, 'forbidden', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'trigger_failed', String(err.message));
    }
  });

  router.post('/workflow-runtime/instances/:id/terminate', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.write', res))) return;
    try {
      const row = await terminateInstance(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        instanceId: req.params.id,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'workflow.instance.terminate',
          resourceType: 'workflow_instance', resourceId: row.instanceId,
          after: { status: row.status },
        });
      } catch { /* noop */ }
      res.status(201).json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'not_found') return fail(res, 404, 'not_found', err.message);
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'terminate_failed', String(err.message));
    }
  });

  router.get('/workflow-runtime/instances/:id/transitions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'workflow.read', res))) return;
    try {
      const out = await listTransitions(deps.client, {
        tenantSchema: ctx.tenantSchema, instanceId: req.params.id,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      return fail(res, 500, 'list_failed', String((e as Error).message));
    }
  });

  return router;
}
