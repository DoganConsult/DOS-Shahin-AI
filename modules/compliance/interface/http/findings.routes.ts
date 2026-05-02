/**
 * Findings REST router (W48) — sub-router on composite `/api/compliance`.
 *
 *   GET    /findings             list (severity, source, status, controlId, requirementId, ownerUserId, search)
 *   GET    /findings/:id         single
 *   POST   /findings             create
 *   PATCH  /findings/:id/status  status transition (auto-stamps closed_at)
 *   DELETE /findings/:id         remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listFindings, getFinding, createFinding,
  updateFindingStatus, deleteFinding,
  type FindingSeverity, type FindingSource, type FindingStatus,
} from '../../application/findings/findings.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface FindingsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface FindingsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => FindingsRouterContext | Promise<FindingsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: FindingsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createFindingsRouter(deps: FindingsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_findings_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/findings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'finding.finding.read', res))) return;
    try {
      const out = await listFindings(deps.client, {
        tenantSchema: ctx.tenantSchema,
        severity: typeof req.query.severity === 'string' ? req.query.severity as FindingSeverity : undefined,
        source: typeof req.query.source === 'string' ? req.query.source as FindingSource : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as FindingStatus : undefined,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : undefined,
        ownerUserId: typeof req.query.ownerUserId === 'string' ? req.query.ownerUserId : undefined,
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

  router.get('/findings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'finding.finding.read', res))) return;
    try {
      const row = await getFinding(deps.client, {
        tenantSchema: ctx.tenantSchema, findingId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `finding ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/findings', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'finding.finding.write', res))) return;
    try {
      const created = await createFinding(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        description: typeof req.body?.description === 'string' ? req.body.description : undefined,
        severity: typeof req.body?.severity === 'string' ? req.body.severity as FindingSeverity : undefined,
        source: typeof req.body?.source === 'string' ? req.body.source as FindingSource : undefined,
        status: typeof req.body?.status === 'string' ? req.body.status as FindingStatus : undefined,
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : undefined,
        requirementId: typeof req.body?.requirementId === 'string' ? req.body.requirementId : undefined,
        gapId: typeof req.body?.gapId === 'string' ? req.body.gapId : undefined,
        ownerUserId: typeof req.body?.ownerUserId === 'string' ? req.body.ownerUserId : undefined,
        identifiedBy: typeof req.body?.identifiedBy === 'string' ? req.body.identifiedBy : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'finding.create',
          resourceType: 'finding', resourceId: created.findingId,
          after: {
            title: created.title, severity: created.severity,
            source: created.source, status: created.status,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_severity') return fail(res, 400, 'bad_severity', err.message);
      if (err.code === 'bad_source') return fail(res, 400, 'bad_source', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/findings/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'finding.finding.write', res))) return;
    try {
      const before = await getFinding(deps.client, {
        tenantSchema: ctx.tenantSchema, findingId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `finding ${req.params.id} not found`);
      const updated = await updateFindingStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        findingId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as FindingStatus : '' as FindingStatus,
      });
      if (!updated) return fail(res, 404, 'not_found', `finding ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'finding.status',
          resourceType: 'finding', resourceId: updated.findingId,
          before: { status: before.status },
          after: { status: updated.status, closedAt: updated.closedAt },
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

  router.delete('/findings/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'finding.finding.write', res))) return;
    try {
      const before = await getFinding(deps.client, {
        tenantSchema: ctx.tenantSchema, findingId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `finding ${req.params.id} not found`);
      const removed = await deleteFinding(deps.client, {
        tenantSchema: ctx.tenantSchema, findingId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `finding ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'finding.delete',
          resourceType: 'finding', resourceId: removed.findingId,
          before: { title: before.title, severity: before.severity },
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
