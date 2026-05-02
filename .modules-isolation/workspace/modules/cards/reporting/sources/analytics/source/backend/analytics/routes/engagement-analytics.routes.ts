import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// Shahin-Ai — Engagement Analytics Routes
// 5 endpoints for engagement analytics data.
// Internal auth (authenticate + tenantGuard).
//
// GET /vendor-scores
// GET /questionnaire-stats
// GET /regulator-requests
// GET /consultant-portfolio
// GET /sla-breaches
//
// Requirements: 19.1, 21.1
// ============================================


import { authenticate } from '../ports/auth.port';
import {
  getVendorScores,
  getQuestionnaireStats,
  getRegulatorRequests,
  getConsultantPortfolio,
  getSLABreaches,
  getOnboardingFunnel,
} from '../services/engagement/engagement-analytics.service';

import { tenantGuard, asyncHandler, moduleStack } from '../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('analytics'));

// All routes require internal auth + tenant guard
router.use(authenticate as any);
router.use(tenantGuard());

// GET /vendor-scores — vendor engagement score summaries
router.get('/vendor-scores', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const scores = await getVendorScores(req.tenantId!);
  res.json(scores);
}));

// GET /questionnaire-stats — questionnaire counts by status + avg completion time
router.get('/questionnaire-stats', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const stats = await getQuestionnaireStats(req.tenantId!);
  res.json(stats);
}));

// GET /regulator-requests — request summary by status and response time
router.get('/regulator-requests', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const requests = await getRegulatorRequests(req.tenantId!);
  res.json(requests);
}));

// GET /consultant-portfolio — portfolio health metrics for the current user
router.get('/consultant-portfolio', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const consultantId = req.user?.userId;
  if (!consultantId) {
    res.status(401).json({ error: 'User ID required' });
    return;
  }
  const portfolio = await getConsultantPortfolio(consultantId);
  res.json(portfolio);
}));

// GET /sla-breaches — breach counts by time period and vendor risk tier
router.get('/sla-breaches', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const breaches = await getSLABreaches(req.tenantId!);
  res.json(breaches);
}));

router.get('/onboarding-funnel', validate({ query: z.object({
  start: z.string().optional(),
  end: z.string().optional(),
}) }), asyncHandler(async (req: Request, res: Response) => {
  const start = typeof req.query.start === 'string' ? req.query.start : null;
  const end = typeof req.query.end === 'string' ? req.query.end : null;
  const endIso = end ?? new Date().toISOString();
  const startIso = start ?? new Date(Date.now() - 30 * 86400_000).toISOString();
  const data = await getOnboardingFunnel(req.tenantId!, { startIso, endIso });
  res.json(data);
}));

export default router;
