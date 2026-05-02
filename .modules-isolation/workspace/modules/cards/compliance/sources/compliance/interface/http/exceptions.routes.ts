/**
 * Exceptions REST router (W16) — sub-router on composite `/api/compliance`.
 *
 *   GET   /exceptions               list (requirementId, exceptionType, status, paging)
 *   GET   /exceptions/:id           single
 *   POST  /exceptions               create
 *   PATCH /exceptions/:id/status    transition status (sets approved_by/approved_at on 'approved')
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listExceptions, getException, createException, updateExceptionStatus,
} from '../../application/exceptions/exceptions.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface ExceptionsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface ExceptionsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => ExceptionsRouterContext | Promise<ExceptionsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: ExceptionsRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createExceptionsRouter(deps: ExceptionsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_exceptions_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/exceptions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'exception.record.read', res))) return;
    try {
      const out = await listExceptions(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : undefined,
        exceptionType: typeof req.query.exceptionType === 'string' ? req.query.exceptionType : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
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

  router.get('/exceptions/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'exception.record.read', res))) return;
    try {
      const row = await getException(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `exception ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/exceptions', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'exception.record.write', res))) return;
    try {
      const created = await createException(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        requirementId: typeof req.body?.requirementId === 'string' ? req.body.requirementId : '',
        exceptionType: typeof req.body?.exceptionType === 'string' ? req.body.exceptionType : '',
        justification: typeof req.body?.justification === 'string' ? req.body.justification : null,
        riskAssessment: typeof req.body?.riskAssessment === 'string' ? req.body.riskAssessment : null,
        compensatingControls: typeof req.body?.compensatingControls === 'string' ? req.body.compensatingControls : null,
        validFrom: typeof req.body?.validFrom === 'string' ? req.body.validFrom : null,
        validTo: typeof req.body?.validTo === 'string' ? req.body.validTo : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'exception.create',
          resourceType: 'compliance_exception', resourceId: created.id,
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

  router.patch('/exceptions/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'exception.record.write', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const approvedBy = typeof req.body?.approvedBy === 'string' ? req.body.approvedBy : undefined;
      const before = await getException(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `exception ${req.params.id} not found`);
      const updated = await updateExceptionStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never, approvedBy,
      });
      if (!updated) return fail(res, 404, 'not_found', `exception ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'exception.status_change',
          resourceType: 'compliance_exception', resourceId: updated.id,
          before: { status: before.status, approvedBy: before.approvedBy },
          after: { status: updated.status, approvedBy: updated.approvedBy },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'update_failed', String(err.message));
    }
  });

  return router;
}
