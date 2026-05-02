/**
 * Programs REST router (W23) — sub-router on composite `/api/compliance`.
 *
 *   GET   /programs                list (programType, status, ownerId, paging)
 *   GET   /programs/:id            single
 *   POST  /programs                create
 *   PATCH /programs/:id/status     transition status
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listPrograms, getProgram,
  createProgram, updateProgramStatus,
} from '../../application/programs/programs.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ProgramsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ProgramsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ProgramsRouterContext | Promise<ProgramsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: ProgramsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createProgramsRouter(deps: ProgramsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_programs_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/programs', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'program.record.read', res))) return;
    try {
      const out = await listPrograms(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        programType: typeof req.query.programType === 'string' ? req.query.programType : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        ownerId: typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined,
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

  router.get('/programs/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'program.record.read', res))) return;
    try {
      const row = await getProgram(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `program ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/programs', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'program.record.write', res))) return;
    try {
      const created = await createProgram(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        name: typeof req.body?.name === 'string' ? req.body.name : '',
        programType: typeof req.body?.programType === 'string' ? req.body.programType : '',
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
        ownerId: typeof req.body?.ownerId === 'string' ? req.body.ownerId : null,
        startDate: typeof req.body?.startDate === 'string' ? req.body.startDate : null,
        endDate: typeof req.body?.endDate === 'string' ? req.body.endDate : null,
        budget: typeof req.body?.budget === 'number' ? req.body.budget : null,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'program.create',
          resourceType: 'compliance_program', resourceId: created.id,
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

  router.patch('/programs/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'program.record.write', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const before = await getProgram(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `program ${req.params.id} not found`);
      const updated = await updateProgramStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never,
      });
      if (!updated) return fail(res, 404, 'not_found', `program ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'program.status_change',
          resourceType: 'compliance_program', resourceId: updated.id,
          before: { status: before.status },
          after: { status: updated.status },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'status_change_failed', String(err.message));
    }
  });

  return router;
}
