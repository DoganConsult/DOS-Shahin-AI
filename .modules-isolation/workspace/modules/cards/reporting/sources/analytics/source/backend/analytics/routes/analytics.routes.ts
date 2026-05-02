import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import {
  computeKPIs,
  getKPITrends,
  getDashboardConfig,
  saveDashboardConfig,
  getBenchmarkData,
  projectKPI,
  computeTenantHealthScore,
} from '../services/analytics/analytics.service';
import { computeMaturityLevel, recordMaturityAssessment } from '../ports/platform.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData as _setAuditData, automationMiddleware, fieldRbacFilter, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { updateDashboardconfigBody, createBenchmarkBody, createMaturityAssessBody } from "../schemas/analytics.schemas";

const router = Router();
router.use(moduleStack('analytics'));
router.use(auditMiddleware("analytics"));
router.use(automationMiddleware("analytics"));
router.use(fieldRbacFilter("analytics"));

/**
 * @swagger
 * /analytics/kpis:
 *   get:
 *     summary: Compute and return current GRC KPIs for the tenant
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: KPI dashboard data including compliance score, risk exposure, remediation rate
 */
router.get("/kpis", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("analytics.report.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const kpis = await computeKPIs(tenantId);
  res.json(kpis);
});

// GET /api/analytics/trends — Get KPI trend data for a date range
/**
 * @swagger
 * /analytics/trends:
 *   get:
 *     summary: Get historical trend data for GRC metrics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Time-series trend data for risks, controls, compliance
 */
router.get("/trends", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("analytics.report.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { startDate, endDate } = req.query;

  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);

  const start = startDate ? new Date(startDate as string) : defaultStart;
  const end = endDate ? new Date(endDate as string) : now;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format for startDate or endDate" });
    return;
  }

  const trends = await getKPITrends(tenantId, start, end);
  res.json(trends);
});

// GET /api/analytics/dashboard-config — Get dashboard config for the user
router.get("/dashboard-config", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("analytics.report.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const config = await getDashboardConfig(tenantId, userId);
  res.json({ config });
});

// PUT /api/analytics/dashboard-config — Save dashboard config for the user
router.put("/dashboard-config", authenticate, requirePermission("analytics.report.write"), validate({ body: updateDashboardconfigBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const config = req.body;

  if (!config || !config.widgets || !config.layout) {
    res.status(400).json({ error: "config must include widgets and layout" });
    return;
  }

  await saveDashboardConfig(tenantId, userId, config);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'analytics', entityId: '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:governance.analytics.updated' });
  res.json({ message: "Dashboard configuration saved" });
});

// POST /api/analytics/benchmark — Get benchmark data for the tenant
router.post("/benchmark", authenticate, requirePermission("analytics.report.read"), validate({ body: createBenchmarkBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const benchmark = await getBenchmarkData(tenantId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'analytics', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:governance.analytics.created' });
  res.json(benchmark);
});

// GET /api/analytics/predictions — Project KPI values 30 days ahead using linear regression on last 90 days
/**
 * @swagger
 * /analytics/predictions:
 *   get:
 *     summary: Get AI-powered predictive analytics for GRC trends
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Predicted compliance, risk, and evidence trends
 */
router.get("/predictions", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("analytics.report.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 90);

  const trends = await getKPITrends(tenantId, startDate, now);

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 30);

  const complianceSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.complianceScore }));
  const riskSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.riskScore }));
  const evidenceSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.evidenceCoverage }));
  const remediationSnapshots = trends.map(t => ({ date: t.snapshotDate, value: t.remediationClosureRate }));

  res.json({
    targetDate: targetDate.toISOString(),
    dataPoints: trends.length,
    predictions: {
      complianceScore: projectKPI(complianceSnapshots, targetDate),
      riskScore: projectKPI(riskSnapshots, targetDate),
      evidenceCoverage: projectKPI(evidenceSnapshots, targetDate),
      remediationClosureRate: projectKPI(remediationSnapshots, targetDate),
    },
  });
});

// GET /api/analytics/maturity — Compute current maturity level from tenant KPIs
router.get("/maturity", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("analytics.report.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const kpis = await computeKPIs(tenantId);

  const criteria = {
    complianceScore: kpis.complianceScore,
    riskScore: kpis.riskScore,
    evidenceCoverage: kpis.evidenceCoverage,
    processMaturity: kpis.remediationClosureRate,
  };

  const level = computeMaturityLevel((criteria as any));
  const invertedRisk = 100 - criteria.riskScore;
  const aggregate = (criteria.complianceScore + invertedRisk + criteria.evidenceCoverage + criteria.processMaturity) / 4;

  res.json({ level, aggregate, criteria });
});

// POST /api/analytics/maturity/assess — Record a maturity assessment with custom criteria
router.post("/maturity/assess", authenticate, requirePermission("analytics.report.write"), validate({ body: createMaturityAssessBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { complianceScore, riskScore, evidenceCoverage, processMaturity } = req.body;

  if (
    complianceScore === undefined ||
    riskScore === undefined ||
    evidenceCoverage === undefined ||
    processMaturity === undefined
  ) {
    res.status(400).json({ error: "complianceScore, riskScore, evidenceCoverage, and processMaturity are required" });
    return;
  }

  const criteria = { complianceScore, riskScore, evidenceCoverage, processMaturity };
  const result = await recordMaturityAssessment(tenantId, criteria);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'analytics', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:governance.analytics.created' });
  res.json(result);
});

// GET /api/analytics/health-score — Compute tenant health score (composite platform metric)
/**
 * @swagger
 * /analytics/health-score:
 *   get:
 *     summary: Get overall GRC program health score (0-100)
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Composite health score with contributing factor breakdown
 */
router.get("/health-score", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("analytics.report.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const healthScore = await computeTenantHealthScore(tenantId);
  res.json(healthScore);
});

export default router;

