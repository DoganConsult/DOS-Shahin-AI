/**
 * Evidence-Files REST router (W49) — sub-router on composite `/api/compliance`.
 *
 *   GET    /evidence-files              list (status, controlId, requirementId, findingId, contentHash, search)
 *   GET    /evidence-files/:id          single
 *   POST   /evidence-files              create metadata (binary lives in storage)
 *   PATCH  /evidence-files/:id/status   status transition
 *   DELETE /evidence-files/:id          remove metadata row
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listEvidenceFiles, getEvidenceFile, createEvidenceFile,
  updateEvidenceFileStatus, deleteEvidenceFile,
  type EvidenceFileStatus,
} from '../../application/evidence-files/evidence-files.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface EvidenceFilesRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface EvidenceFilesRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => EvidenceFilesRouterContext | Promise<EvidenceFilesRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: EvidenceFilesRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createEvidenceFilesRouter(deps: EvidenceFilesRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_evidence_files_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/evidence-files', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence_file.file.read', res))) return;
    try {
      const out = await listEvidenceFiles(deps.client, {
        tenantSchema: ctx.tenantSchema,
        status: typeof req.query.status === 'string' ? req.query.status as EvidenceFileStatus : undefined,
        controlId: typeof req.query.controlId === 'string' ? req.query.controlId : undefined,
        requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : undefined,
        findingId: typeof req.query.findingId === 'string' ? req.query.findingId : undefined,
        contentHash: typeof req.query.contentHash === 'string' ? req.query.contentHash : undefined,
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

  router.get('/evidence-files/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence_file.file.read', res))) return;
    try {
      const row = await getEvidenceFile(deps.client, {
        tenantSchema: ctx.tenantSchema, fileId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `evidence_file ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/evidence-files', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence_file.file.write', res))) return;
    try {
      const created = await createEvidenceFile(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        filename: typeof req.body?.filename === 'string' ? req.body.filename : '',
        mimeType: typeof req.body?.mimeType === 'string' ? req.body.mimeType : '',
        sizeBytes: typeof req.body?.sizeBytes === 'number' ? req.body.sizeBytes : NaN,
        contentHash: typeof req.body?.contentHash === 'string' ? req.body.contentHash : '',
        storageUri: typeof req.body?.storageUri === 'string' ? req.body.storageUri : '',
        controlId: typeof req.body?.controlId === 'string' ? req.body.controlId : undefined,
        requirementId: typeof req.body?.requirementId === 'string' ? req.body.requirementId : undefined,
        findingId: typeof req.body?.findingId === 'string' ? req.body.findingId : undefined,
        retentionUntil: typeof req.body?.retentionUntil === 'string' ? req.body.retentionUntil : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'evidence_file.create',
          resourceType: 'evidence_file', resourceId: created.fileId,
          after: {
            filename: created.filename, sizeBytes: created.sizeBytes,
            contentHash: created.contentHash, mimeType: created.mimeType,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_size') return fail(res, 400, 'bad_size', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/evidence-files/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence_file.file.write', res))) return;
    try {
      const before = await getEvidenceFile(deps.client, {
        tenantSchema: ctx.tenantSchema, fileId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `evidence_file ${req.params.id} not found`);
      const updated = await updateEvidenceFileStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        fileId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as EvidenceFileStatus : '' as EvidenceFileStatus,
      });
      if (!updated) return fail(res, 404, 'not_found', `evidence_file ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'evidence_file.status',
          resourceType: 'evidence_file', resourceId: updated.fileId,
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

  router.delete('/evidence-files/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'evidence_file.file.write', res))) return;
    try {
      const before = await getEvidenceFile(deps.client, {
        tenantSchema: ctx.tenantSchema, fileId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `evidence_file ${req.params.id} not found`);
      const removed = await deleteEvidenceFile(deps.client, {
        tenantSchema: ctx.tenantSchema, fileId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `evidence_file ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'evidence_file.delete',
          resourceType: 'evidence_file', resourceId: removed.fileId,
          before: { filename: before.filename, contentHash: before.contentHash },
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
