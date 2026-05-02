/**
 * Attestations REST router (W15) — top-level promotion of `/api/compliance-attestation`.
 *
 *   GET   /                       list (frameworkId, attestationType, status, attestedBy, paging)
 *   GET   /:id                    single
 *   POST  /                       create
 *   PATCH /:id/status             transition status
 *
 * Mounted via `routers['/api/compliance-attestation']` override so the
 * aggregator mount table flips that prefix to `wired=true`.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listAttestations, getAttestation, createAttestation, updateAttestationStatus,
} from '../../application/attestations/attestations.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface AttestationsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface AttestationsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => AttestationsRouterContext | Promise<AttestationsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (ctx: AttestationsRouterContext, key: string, res: Response): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createAttestationsRouter(deps: AttestationsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_attestations_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation.record.read', res))) return;
    try {
      const out = await listAttestations(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId,
        frameworkId: typeof req.query.frameworkId === 'string' ? req.query.frameworkId : undefined,
        attestationType: typeof req.query.attestationType === 'string' ? req.query.attestationType : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
        attestedBy: typeof req.query.attestedBy === 'string' ? req.query.attestedBy : undefined,
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

  router.get('/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation.record.read', res))) return;
    try {
      const row = await getAttestation(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `attestation ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation.record.write', res))) return;
    try {
      const created = await createAttestation(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        frameworkId: typeof req.body?.frameworkId === 'string' ? req.body.frameworkId : '',
        attestationType: typeof req.body?.attestationType === 'string' ? req.body.attestationType : '',
        attestedBy: typeof req.body?.attestedBy === 'string' ? req.body.attestedBy : undefined,
        periodStart: typeof req.body?.periodStart === 'string' ? req.body.periodStart : null,
        periodEnd: typeof req.body?.periodEnd === 'string' ? req.body.periodEnd : null,
        status: typeof req.body?.status === 'string' ? (req.body.status as never) : undefined,
        declaration: typeof req.body?.declaration === 'string' ? req.body.declaration : null,
        evidenceRefs: Array.isArray(req.body?.evidenceRefs) ? req.body.evidenceRefs : [],
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation.create',
          resourceType: 'compliance_attestation', resourceId: created.id,
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

  router.patch('/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'attestation.record.write', res))) return;
    try {
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const before = await getAttestation(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, id: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `attestation ${req.params.id} not found`);
      const updated = await updateAttestationStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, tenantId: ctx.tenantId, actorId: ctx.userId,
        id: req.params.id, status: status as never,
      });
      if (!updated) return fail(res, 404, 'not_found', `attestation ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'attestation.status_change',
          resourceType: 'compliance_attestation', resourceId: updated.id,
          before: { status: before.status },
          after: { status: updated.status },
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
