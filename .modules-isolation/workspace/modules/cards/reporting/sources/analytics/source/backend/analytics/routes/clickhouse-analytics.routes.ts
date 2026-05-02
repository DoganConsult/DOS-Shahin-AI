import { Request, Response, Router } from 'express';
import { z } from "zod";
/**
 * ClickHouse Analytics Routes
 *
 * Exposes ClickHouse analytics data via REST API:
 *   GET /api/analytics/clickhouse/health
 *   GET /api/analytics/clickhouse/audit-timeline
 *   GET /api/analytics/clickhouse/agent-performance
 *   GET /api/analytics/clickhouse/api-latency
 */


import { authenticate, requirePermission } from '../ports/auth.port';
import { checkClickHouseHealth, isClickHouseEnabled } from '../ports/platform.port';
import {
  getAuditTimeline,
  getAgentPerformanceAggregates,
  getApiLatencyPercentiles,
} from '../services/misc/clickhouse-analytics.service';
import { toErrorMessage } from '@dos/module-sdk';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(authenticate);

/**
 * GET /api/analytics/clickhouse/health
 * Returns ClickHouse connection status and version info.
 */
router.get('/health', validate({ query: z.record(z.unknown()) }), requirePermission('analytics.report.read'), async (_req: Request, res: Response) => {
  try {
    const health = await checkClickHouseHealth();
    res.json({ success: true, data: health });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: toErrorMessage(err) });
  }
});

/**
 * GET /api/analytics/clickhouse/audit-timeline
 * Query params: days (default 30), granularity (hour | day, default day)
 */
router.get('/audit-timeline', validate({ query: z.record(z.unknown()) }), requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
    if (!isClickHouseEnabled()) {
      return res.json({ success: true, data: [], message: 'ClickHouse is disabled' });
    }

    const tenantId = req.tenantId!;
    const days = parseInt(req.query.days as string) || 30;
    const granularity = (req.query.granularity as 'hour' | 'day') || 'day';

    const timeline = await getAuditTimeline(tenantId, days, granularity);
    res.json({ success: true, data: timeline });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: toErrorMessage(err) });
  }
});

/**
 * GET /api/analytics/clickhouse/agent-performance
 * Query params: days (default 30)
 */
router.get('/agent-performance', validate({ query: z.record(z.unknown()) }), requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
    if (!isClickHouseEnabled()) {
      return res.json({ success: true, data: [], message: 'ClickHouse is disabled' });
    }

    const tenantId = req.tenantId!;
    const days = parseInt(req.query.days as string) || 30;

    const performance = await getAgentPerformanceAggregates(tenantId, days);
    res.json({ success: true, data: performance });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: toErrorMessage(err) });
  }
});

/**
 * GET /api/analytics/clickhouse/api-latency
 * Query params: days (default 7)
 */
router.get('/api-latency', validate({ query: z.record(z.unknown()) }), requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
    if (!isClickHouseEnabled()) {
      return res.json({ success: true, data: [], message: 'ClickHouse is disabled' });
    }

    const tenantId = req.tenantId!;
    const days = parseInt(req.query.days as string) || 7;

    const latency = await getApiLatencyPercentiles(tenantId, days);
    res.json({ success: true, data: latency });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: toErrorMessage(err) });
  }
});

export default router;
