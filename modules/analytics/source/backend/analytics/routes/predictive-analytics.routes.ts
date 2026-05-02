import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  forecastComplianceScore, estimateRemediationTime,
  predictRiskEscalation, getAnalyticsDashboard,
} from '../services/misc/predictive-analytics.service';

import { asyncHandler, moduleStack } from '../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('analytics'));

/**
 * @openapi
 * /predictive-analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Full predictive analytics dashboard
 */
router.get('/dashboard', authenticate, requirePermission('analytics.report.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getAnalyticsDashboard(tenantId);
  res.json(data);
}));

/**
 * @openapi
 * /predictive-analytics/compliance-forecast:
 *   get:
 *     tags: [Analytics]
 *     summary: Forecast compliance score trend using linear regression
 *     parameters:
 *       - name: daysAhead
 *         in: query
 *         schema: { type: integer, default: 90 }
 */
router.get('/compliance-forecast', authenticate, requirePermission('analytics.report.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const daysAhead = Number(req.query.daysAhead) || 90;
  const data = await forecastComplianceScore(tenantId, daysAhead);
  res.json(data);
}));

/**
 * @openapi
 * /predictive-analytics/remediation-estimate:
 *   get:
 *     tags: [Analytics]
 *     summary: Estimate remediation time by severity based on historical data
 */
router.get('/remediation-estimate', authenticate, requirePermission('analytics.report.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { severity = 'high' } = req.query;
  const data = await estimateRemediationTime(tenantId, String(severity));
  res.json(data);
}));

/**
 * @openapi
 * /predictive-analytics/risk-escalation:
 *   get:
 *     tags: [Analytics]
 *     summary: Predict which open risks are likely to escalate
 */
router.get('/risk-escalation', authenticate, requirePermission('analytics.report.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await predictRiskEscalation(tenantId);
  res.json({ data });
}));

export default router;
