import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { logger } from '../../ports/logger.port';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Report Stream Routes
// API endpoints for real-time report streaming,
// natural language report generation, and drill-down
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  startReportStream,
  stopReportStream,
  getReportSnapshot,
  refreshReportStream,
  ReportStreamConfig,
} from '../../services/report/report-stream.service';
import {
  generateNaturalReport,
  getNaturalReportHistory,
  NaturalReportQuery,
} from '../../services/misc/natural-report-generator.service';
import {
  getDrillDownNode,
  navigateToPath,
  DrillDownRequest,
} from '../../services/report/report-drilldown.service';
import { errMsg } from '../../../../i18n/error-messages';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, validate, moduleStack } from '../../ports/middleware.port';
import { createStreamStartBody, createStreamStopreportIdBody, createStreamRefreshreportIdBody, createNaturalGenerateBody } from "../../schemas/reporting.schemas";

const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware('reporting'));
router.use(authenticate);

// === Report Streaming ===

/**
 * POST /api/reports/stream/start
 * Start a real-time report stream.
 */
router.post('/stream/start', validate({ body: createStreamStartBody }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const { reportId, reportType, filters, refreshInterval } = req.body;

  if (!reportId || !reportType) {
    return res.status(400).json({ error: errMsg('VALIDATION_ERROR', req) });
  }

  const config: ReportStreamConfig = {
    reportId,
    reportType,
    tenantId,
    userId,
    filters,
    refreshInterval: refreshInterval || 5000,
  };

  await startReportStream(config);
  setAuditData(res as any, { action: 'create', entityType: 'report_stream', entityId: reportId });

  res.json({ success: true, reportId, message: 'Stream started' });
});

/**
 * POST /api/reports/stream/stop
 * Stop a report stream.
 */
router.post('/stream/stop/:reportId', validate({ body: createStreamStopreportIdBody }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { reportId } = req.params;

  stopReportStream(tenantId, reportId);
  setAuditData(res as any, { action: 'delete', entityType: 'report_stream', entityId: reportId });

  res.json({ success: true, message: 'Stream stopped' });
});

/**
 * GET /api/reports/stream/snapshot/:reportId
 * Get current snapshot of a report stream.
 */
router.get('/stream/snapshot/:reportId', validate({ query: z.record(z.unknown()) }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { reportId } = req.params;

  const snapshot = getReportSnapshot(tenantId, reportId);
  if (!snapshot) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  res.json(snapshot);
});

/**
 * POST /api/reports/stream/refresh/:reportId
 * Force refresh a report stream.
 */
router.post('/stream/refresh/:reportId', validate({ body: createStreamRefreshreportIdBody }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { reportId } = req.params;

  await refreshReportStream(tenantId, reportId);
  res.json({ success: true, message: 'Stream refreshed' });
});

// === Natural Language Report Generation ===

/**
 * POST /api/reports/natural/generate
 * Generate a report from natural language query.
 */
router.post('/natural/generate', validate({ body: createNaturalGenerateBody }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId!;
    const { query, language, context } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const input: NaturalReportQuery = {
      query,
      tenantId,
      userId,
      language: language || 'en',
      context,
    };

    const report = await generateNaturalReport(input);
    setAuditData(res as any, {
      action: 'create',
      entityType: 'natural_report',
      entityId: report.reportId,
      afterState: { query, intent: report.metadata.intent },
    });

    res.json(report);
  } catch (err: unknown) {
    logger.error('[NaturalReport] Generation failed:', err);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * GET /api/reports/natural/history
 * Get natural report history for the current user.
 */
router.get('/natural/history', validate({ query: z.record(z.unknown()) }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const limit = parseInt(req.query.limit as string) || 20;

  const history = await getNaturalReportHistory(tenantId, userId, limit);
  res.json({ reports: history });
});

// === Drill-Down Navigation ===

/**
 * GET /api/reports/drilldown
 * Get drill-down node with optional children.
 */
router.get('/drilldown', validate({ query: z.record(z.unknown()) }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const {
      nodeId,
      nodeType,
      parentPath,
      depth,
      ...filters
    } = req.query;

    const request: DrillDownRequest = {
      tenantId,
      nodeId: nodeId as string,
      nodeType: nodeType as string,
      parentPath: parentPath ? (parentPath as string).split(',') : undefined,
      filters: filters as Record<string, unknown>,
      depth: depth ? parseInt(depth as string) : 1,
    };

    const response = await getDrillDownNode(request);
    res.json(response);
  } catch (err: unknown) {
    logger.error('[DrillDown] Error:', err);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * GET /api/reports/drilldown/path
 * Navigate to a specific path in the drill-down hierarchy.
 */
router.get('/drilldown/path', validate({ query: z.record(z.unknown()) }), requirePermission('report.document.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { path: pathStr, ...filters } = req.query;

    if (!pathStr || typeof pathStr !== 'string') {
      return res.status(400).json({ error: 'Path is required' });
    }

    const path = pathStr.split(',').filter(Boolean);
    const response = await navigateToPath(tenantId, path, filters as Record<string, unknown>);
    res.json(response);
  } catch (err: unknown) {
    logger.error('[DrillDown] Path navigation error:', err);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

