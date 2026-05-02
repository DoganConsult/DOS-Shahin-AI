/**
 * Export router — sync, async, status, download.
 *
 * Mounted on `/api/compliance` alongside ui-discovery and runtime-config.
 *   POST /export/single                 — sync export, returns body inline
 *   POST /export/async                  — start async job, returns job descriptor
 *   GET  /export/jobs/:id               — job status (progress)
 *   GET  /export/jobs/:id/download      — 302 redirect to result_url, or 409 if not ready
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import {
  runSyncExport,
  startAsyncExport,
  getJob,
  type ExportDeps,
  type ExportFormat,
} from '../../application/export/export.service';

export interface ExportRouterDeps extends ExportDeps {
  resolveContext: (req: Request) => { tenantId: string; userId: string } | Promise<{ tenantId: string; userId: string }>;
}

const isFormat = (s: unknown): s is ExportFormat =>
  typeof s === 'string' && ['csv', 'xlsx', 'pdf', 'json'].includes(s);

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

export function createExportRouter(deps: ExportRouterDeps): ExpressRouter {
  const router = Router();

  const ctx = async (req: Request, res: Response) => {
    try { return await deps.resolveContext(req); }
    catch (err) { fail(res, 401, 'no_context', String((err as Error).message)); return null; }
  };

  router.post('/export/single', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const { scopeType, format, query } = req.body ?? {};
    if (typeof scopeType !== 'string') return fail(res, 400, 'bad_scope', 'scopeType required');
    if (!isFormat(format)) return fail(res, 400, 'bad_format', 'format must be csv|xlsx|pdf|json');
    try {
      const result = await runSyncExport(deps, {
        tenantId: c.tenantId, userId: c.userId,
        scopeType, format, query: (query ?? {}) as Record<string, unknown>,
      });
      res.setHeader('content-type', result.contentType);
      res.setHeader('content-disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.body);
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'no_emitter') return fail(res, 404, 'no_emitter', e.message);
      return fail(res, 500, 'export_failed', String(e.message));
    }
  });

  router.post('/export/async', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const { scopeType, format, query } = req.body ?? {};
    if (typeof scopeType !== 'string') return fail(res, 400, 'bad_scope', 'scopeType required');
    if (!isFormat(format)) return fail(res, 400, 'bad_format', 'format must be csv|xlsx|pdf|json');
    try {
      const job = await startAsyncExport(deps, {
        tenantId: c.tenantId, userId: c.userId,
        scopeType, format, query: (query ?? {}) as Record<string, unknown>,
      });
      res.status(202).json({ data: job });
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'no_emitter') return fail(res, 404, 'no_emitter', e.message);
      return fail(res, 500, 'export_failed', String(e.message));
    }
  });

  router.get('/export/jobs/:id', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const job = await getJob(deps, req.params.id);
    if (!job) return fail(res, 404, 'not_found', `job ${req.params.id} not found`);
    if (job.tenantId !== c.tenantId) return fail(res, 404, 'not_found', `job ${req.params.id} not found`);
    res.json({ data: job });
  });

  router.get('/export/jobs/:id/download', async (req, res) => {
    const c = await ctx(req, res); if (!c) return;
    const job = await getJob(deps, req.params.id);
    if (!job || job.tenantId !== c.tenantId) return fail(res, 404, 'not_found', 'job not found');
    if (job.status !== 'succeeded') return fail(res, 409, 'not_ready', `status=${job.status}`);
    if (!job.resultUrl) return fail(res, 404, 'no_artifact', 'job succeeded with no artifact');
    res.redirect(302, job.resultUrl);
  });

  return router;
}
