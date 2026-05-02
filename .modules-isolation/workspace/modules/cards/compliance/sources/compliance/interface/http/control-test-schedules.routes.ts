/**
 * Control-Test-Schedules REST router (W38) — sub-router on composite `/api/compliance`.
 *
 *   GET    /control-test-schedules                            list (controlId, frequency, lastResult, dueBefore, paging)
 *   GET    /control-test-schedules/:id                        single
 *   POST   /control-test-schedules                            create
 *   PATCH  /control-test-schedules/:id                        partial update
 *   PATCH  /control-test-schedules/:id/execution              record execution result + advance next date
 *   DELETE /control-test-schedules/:id                        remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listSchedules, getSchedule, createSchedule, updateSchedule,
  recordExecution, deleteSchedule,
  type TestFrequency, type TestResult,
} from '../../application/control-test-schedules/control-test-schedules.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ControlTestSchedulesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ControlTestSchedulesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ControlTestSchedulesRouterContext | Promise<ControlTestSchedulesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ControlTestSchedulesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createControlTestSchedulesRouter(deps: ControlTestSchedulesRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_control_test_schedules_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/control-test-schedules', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_test_schedule.schedule.read', res))) return;
    try {
      const out = await listSchedules(deps.client, {
        tenantSchema: ctx.tenantSchema,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        frequency: typeof req.query.frequency === 'string' ? req.query.frequency as TestFrequency : undefined,
        lastResult: typeof req.query.lastResult === 'string' ? req.query.lastResult as TestResult : undefined,
        dueBefore: typeof req.query.dueBefore === 'string' ? req.query.dueBefore : undefined,
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

  router.get('/control-test-schedules/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_test_schedule.schedule.read', res))) return;
    try {
      const row = await getSchedule(deps.client, {
        tenantSchema: ctx.tenantSchema, scheduleId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `schedule ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/control-test-schedules', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_test_schedule.schedule.write', res))) return;
    try {
      const created = await createSchedule(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : '',
        testType: typeof req.body?.testType === 'string' ? req.body.testType : null,
        frequency: typeof req.body?.frequency === 'string' ? req.body.frequency as TestFrequency : undefined,
        nextExecutionDate: typeof req.body?.nextExecutionDate === 'string' ? req.body.nextExecutionDate : null,
        assignedTo: typeof req.body?.assignedTo === 'string' ? req.body.assignedTo : null,
        autoExecute: typeof req.body?.autoExecute === 'boolean' ? req.body.autoExecute : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_test_schedule.create',
          resourceType: 'control_test_schedule', resourceId: created.scheduleId,
          after: { controlId: created.controlId, frequency: created.frequency, nextExecutionDate: created.nextExecutionDate },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_frequency') return fail(res, 400, 'bad_frequency', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/control-test-schedules/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_test_schedule.schedule.write', res))) return;
    try {
      const before = await getSchedule(deps.client, {
        tenantSchema: ctx.tenantSchema, scheduleId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `schedule ${req.params.id} not found`);
      const updated = await updateSchedule(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        scheduleId: req.params.id,
        testType: typeof req.body?.testType === 'string' ? req.body.testType : null,
        frequency: typeof req.body?.frequency === 'string' ? req.body.frequency as TestFrequency : undefined,
        nextExecutionDate: typeof req.body?.nextExecutionDate === 'string' ? req.body.nextExecutionDate : null,
        assignedTo: typeof req.body?.assignedTo === 'string' ? req.body.assignedTo : null,
        autoExecute: typeof req.body?.autoExecute === 'boolean' ? req.body.autoExecute : undefined,
      });
      if (!updated) return fail(res, 404, 'not_found', `schedule ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_test_schedule.update',
          resourceType: 'control_test_schedule', resourceId: updated.scheduleId,
          before: { frequency: before.frequency, nextExecutionDate: before.nextExecutionDate, assignedTo: before.assignedTo },
          after: { frequency: updated.frequency, nextExecutionDate: updated.nextExecutionDate, assignedTo: updated.assignedTo },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_frequency') return fail(res, 400, 'bad_frequency', err.message);
      return fail(res, 500, 'update_failed', String(err.message));
    }
  });

  router.patch('/control-test-schedules/:id/execution', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_test_schedule.schedule.write', res))) return;
    try {
      const before = await getSchedule(deps.client, {
        tenantSchema: ctx.tenantSchema, scheduleId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `schedule ${req.params.id} not found`);
      const updated = await recordExecution(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        scheduleId: req.params.id,
        result: typeof req.body?.result === 'string' ? req.body.result as TestResult : 'pass',
        nextExecutionDate: typeof req.body?.nextExecutionDate === 'string' ? req.body.nextExecutionDate : null,
      });
      if (!updated) return fail(res, 404, 'not_found', `schedule ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_test_schedule.execution',
          resourceType: 'control_test_schedule', resourceId: updated.scheduleId,
          before: { lastResult: before.lastResult, lastExecutedAt: before.lastExecutedAt },
          after: { lastResult: updated.lastResult, lastExecutedAt: updated.lastExecutedAt, nextExecutionDate: updated.nextExecutionDate },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_result') return fail(res, 400, 'bad_result', err.message);
      return fail(res, 500, 'execution_failed', String(err.message));
    }
  });

  router.delete('/control-test-schedules/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'control_test_schedule.schedule.write', res))) return;
    try {
      const before = await getSchedule(deps.client, {
        tenantSchema: ctx.tenantSchema, scheduleId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `schedule ${req.params.id} not found`);
      const removed = await deleteSchedule(deps.client, {
        tenantSchema: ctx.tenantSchema, scheduleId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `schedule ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'control_test_schedule.delete',
          resourceType: 'control_test_schedule', resourceId: removed.scheduleId,
          before: { controlId: before.controlId, frequency: before.frequency },
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
