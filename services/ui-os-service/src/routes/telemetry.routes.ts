import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsTelemetryManager } from '../managers/ui-os-telemetry.manager.js';
import {
  PageViewSchema, ClickSchema, CommandSchema, RenderPerfSchema, ErrorSchema,
  WidgetUsageSchema, SearchEventSchema, FunnelStepSchema, RetentionSchema,
} from '../schemas/telemetry.schemas.js';
import { requireFga } from '../middleware/openfga.js';

function ctx(req: Request, res: Response) {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return null; }
  return { tenantId, userId };
}
function fail(res: Response, code: string, e: unknown) {
  const m = (e as Error).message;
  res.status(500).json({ error: code, message: m });
}

export function createTelemetryRouter(pool: DbPool): Router {
  const router = Router();
  const m = new UiOsTelemetryManager(pool);
  const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
  const fgaAdmin = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'admin', object: `ui_os_tenant:${req.principal.tenantId}` } : null });

  // ── Page view ───────────────────────────────────────────────
  router.post('/telemetry/page-view', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = PageViewSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordPageView(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'page_view_record_failed', e); }
  });
  router.get('/telemetry/page-view/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ stats: await m.pageViewStats(c.tenantId, {
      routeKey: (req.query.routeKey as string | undefined) ?? null,
      sinceHours: parseInt(String(req.query.sinceHours ?? 24), 10),
    }) }); } catch (e) { fail(res, 'page_view_stats_failed', e); }
  });

  // ── Click ───────────────────────────────────────────────────
  router.post('/telemetry/click', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = ClickSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordClick(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'click_record_failed', e); }
  });
  router.get('/telemetry/click/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ stats: await m.clickStats(c.tenantId, {
      targetKind: (req.query.targetKind as string | undefined) ?? null,
      sinceHours: parseInt(String(req.query.sinceHours ?? 24), 10),
    }) }); } catch (e) { fail(res, 'click_stats_failed', e); }
  });

  // ── Command ─────────────────────────────────────────────────
  router.post('/telemetry/command', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = CommandSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordCommand(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'command_record_failed', e); }
  });
  router.get('/telemetry/command/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ stats: await m.commandStats(c.tenantId,
      parseInt(String(req.query.sinceHours ?? 24), 10)) }); } catch (e) { fail(res, 'command_stats_failed', e); }
  });

  // ── Render perf ─────────────────────────────────────────────
  router.post('/telemetry/render-perf', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = RenderPerfSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordRenderPerf(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'render_perf_record_failed', e); }
  });
  router.get('/telemetry/render-perf/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ stats: await m.renderPerfStats(c.tenantId, {
      routeKey: (req.query.routeKey as string | undefined) ?? null,
      sinceHours: parseInt(String(req.query.sinceHours ?? 24), 10),
    }) }); } catch (e) { fail(res, 'render_perf_stats_failed', e); }
  });

  // ── Error ───────────────────────────────────────────────────
  router.post('/telemetry/error', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = ErrorSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordError(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'error_record_failed', e); }
  });
  router.get('/telemetry/error/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ stats: await m.errorStats(c.tenantId, {
      errorKind: (req.query.errorKind as string | undefined) ?? null,
      sinceHours: parseInt(String(req.query.sinceHours ?? 24), 10),
    }) }); } catch (e) { fail(res, 'error_stats_failed', e); }
  });

  // ── Widget usage ────────────────────────────────────────────
  router.post('/telemetry/widget-usage', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = WidgetUsageSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordWidgetUsage(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'widget_usage_record_failed', e); }
  });
  router.get('/telemetry/widget-usage/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ stats: await m.widgetUsageStats(c.tenantId,
      parseInt(String(req.query.sinceHours ?? 24), 10)) }); } catch (e) { fail(res, 'widget_usage_stats_failed', e); }
  });

  // ── Search events ───────────────────────────────────────────
  router.post('/telemetry/search', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = SearchEventSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordSearchEvent(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'search_event_record_failed', e); }
  });
  router.get('/telemetry/search/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ stats: await m.searchStats(c.tenantId,
      parseInt(String(req.query.sinceHours ?? 24), 10)) }); } catch (e) { fail(res, 'search_stats_failed', e); }
  });

  // ── Funnel events ───────────────────────────────────────────
  router.post('/telemetry/funnel', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = FunnelStepSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(202).json(await m.recordFunnelStep(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'funnel_record_failed', e); }
  });
  router.get('/telemetry/funnel/:funnelCode/stats', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ steps: await m.funnelStats(c.tenantId, req.params.funnelCode,
      parseInt(String(req.query.sinceHours ?? 168), 10)) }); } catch (e) { fail(res, 'funnel_stats_failed', e); }
  });

  // ── Retention snapshots ─────────────────────────────────────
  router.post('/telemetry/retention', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = RetentionSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(201).json(await m.recordRetention(c.tenantId, p.data)); } catch (e) { fail(res, 'retention_record_failed', e); }
  });
  router.get('/telemetry/retention', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ matrix: await m.retentionMatrix(c.tenantId,
      (req.query.cohortCode as string | undefined) ?? null) }); } catch (e) { fail(res, 'retention_matrix_failed', e); }
  });

  return router;
}
