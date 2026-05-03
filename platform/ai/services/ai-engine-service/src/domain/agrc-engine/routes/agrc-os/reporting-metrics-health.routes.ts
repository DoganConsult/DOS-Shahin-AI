import { Request, Response, Router } from 'express';
import { z as _z } from 'zod';
import { validate, auditMiddleware } from '../../ports/middleware.port';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg as _errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { writeLimiter } from './shared';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import { emptyResult } from '../../ports/database.port';

import { createEscalateBody } from '../../schemas/agrc-engine.schemas';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('agrc-engine'));

router.get('/ready', validate({ query: z.record(z.unknown()) }), (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'agrc-os', timestamp: new Date().toISOString() });
});

router.get('/reporting/status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const { getReportSchedulesWithStatus } = await import('../../services/agrc-os-reporting.service');
  const graceHours = parseInt(req.query.escalationGraceHours as string) || 48;
  const result = await getReportSchedulesWithStatus(req.tenantId, graceHours);
  res.json(result);
});

router.post('/reporting/escalate', authenticate, requirePermission('report.document.write'), writeLimiter, validate({ body: createEscalateBody }), async (req: Request, res: Response) => {
  const { escalateOverdueReports } = await import('../../services/agrc-os-reporting.service');
  const graceHours = parseInt(req.body?.escalationGraceHours as string) || 48;
  const result = await escalateOverdueReports(req.tenantId, graceHours);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.get('/reporting/live/export', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.download'), async (req: Request, res: Response) => {
  const { exportLiveReport } = await import('../../services/agrc-os-reporting.service');
  const format = (req.query.format as string)?.toLowerCase() === 'excel' ? 'excel' : 'pdf';
  const frameworkId = req.query.frameworkId as string | undefined;
  const language = (req.query.language as string) || 'en';
  const buffer = await exportLiveReport(req.tenantId, format, { frameworkId, language });
  const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  const filename = `agrc-os-live-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

router.get('/metrics', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  const { computeMetrics } = await import('../../services/agrc-metrics.service');
  const hours = parseInt(req.query.hours as string) || 24;
  const result = await computeMetrics(req.tenantId, hours);
  res.json(result);
});

router.get('/metrics/history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  const { getMetricsHistory } = await import('../../services/agrc-metrics.service');
  const result = await getMetricsHistory(req.tenantId, parseInt(req.query.limit as string) || 30);
  res.json(result);
});

router.get('/agent-status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  const { query: dbQuery } = await import('@dos/db');
  const tenantId = req.tenantId;

  const AGENTS = [
    { id: 'A01', name: 'Onboarding', icon: 'pi-user-plus', domain: 'Org Profiling' },
    { id: 'A02', name: 'Identity', icon: 'pi-id-card', domain: 'Access Governance' },
    { id: 'A03', name: 'Framework Mapping', icon: 'pi-sitemap', domain: 'Frameworks' },
    { id: 'A04', name: 'Control Authoring', icon: 'pi-pencil', domain: 'Controls' },
    { id: 'A05', name: 'Evidence', icon: 'pi-folder-open', domain: 'Evidence' },
    { id: 'A06', name: 'Gap Remediation', icon: 'pi-wrench', domain: 'Compliance' },
    { id: 'A07', name: 'Risk Register', icon: 'pi-exclamation-triangle', domain: 'Risk' },
    { id: 'A08', name: 'Policy Lifecycle', icon: 'pi-file-edit', domain: 'Policies' },
    { id: 'A09', name: 'Third-Party Risk', icon: 'pi-truck', domain: 'Vendors' },
    { id: 'A10', name: 'Audit Reporting', icon: 'pi-chart-bar', domain: 'Audit' },
  ];

  const perfResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), dbQuery(
    `SELECT agent_id,
            MAX(executed_at) AS last_run,
            COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '24 hours' AND success = TRUE) AS actions_today
     FROM agent_performance
     WHERE tenant_id = $1 AND tool_name = 'autonomous_scan'
     GROUP BY agent_id`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'fallback query' });

  const perfMap = new Map<string, { last_run: string | null; actions_today: number }>();
  for (const row of perfResult.rows) {

    const r = row as any;
    perfMap.set(r.agent_id, { last_run: r.last_run as string | null, actions_today: Number(r.actions_today) });
  }

  const agents = AGENTS.map(a => {
    const perf = perfMap.get(a.id);
    const lastRun = perf?.last_run ? new Date(perf.last_run) : null;
    const minsAgo = lastRun ? Math.round((Date.now() - lastRun.getTime()) / 60000) : null;
    return {
      ...a,
      lastRunAt: perf?.last_run ?? null,
      minsAgo,
      actionsToday: perf?.actions_today ?? 0,
      status: minsAgo === null ? 'idle' : minsAgo < 120 ? 'active' : 'stale',
    };
  });

  const totalActionsToday = agents.reduce((s, a) => s + a.actionsToday, 0);
  const lastCycleMin = agents
    .map(a => a.minsAgo)
    .filter((m): m is number => m !== null)
    .reduce((min, m) => Math.min(min, m), Infinity);

  res.json({
    agents,
    totalActionsToday,
    lastCycleMin: lastCycleMin === Infinity ? null : lastCycleMin,
    activeAgents: agents.filter(a => a.status === 'active').length,
  });
});

router.get('/health', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  const { computeMetrics } = await import('../../services/agrc-metrics.service');
  const metrics = await computeMetrics(req.tenantId);
  res.json({
    status: metrics.healthStatus,
    lastCycleAt: metrics.lastCycleAt,
    cycleCount24h: metrics.cycleCount,
    avgCycleMs: metrics.avgCycleMs,
    criticalEvents: metrics.criticalEvents,
  });
});

export default router;

