import { Request, Response, Router } from 'express';


import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z as _z } from 'zod';

import { asyncHandler, validate, auditMiddleware } from '../ports/middleware.port';
/**
 * quality-gate — REST API Routes
 * All routes are tenant-scoped via JWT tenantId.
 * Mounted at /api/quality-gate
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import * as runService from '../services/quality-gate-run.service';
import * as dashService from '../services/quality-gate-dashboard.service';
import * as driftService from '../services/stages/schema-drift.service';
import * as aiEvalService from '../services/stages/ai-guardrails.service';
import { createRunBody, overrideRunBody, updateThresholdBody, listRunsQuery, driftQuery, aiEvalQuery, trendsQuery, createRunsBody, createOverrideBody, updateThresholdsBody, createResolveBody } from '../schemas/quality-gate.schemas';

const router = Router();
router.use(auditMiddleware('quality-gate'));

// ═══════════════════════════════════════════════════════════════
// Runs
// ═══════════════════════════════════════════════════════════════

// POST /runs — Trigger new quality gate evaluation
router.post('/runs', authenticate, requirePermission('quality-gate.run.execute'), validate(createRunsBody), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;
  const input = createRunBody.parse(req.body);
  const run = await runService.createRun(tenantId, {
    releaseId: input.releaseId,
    commitSha: input.commitSha,
    triggerType: input.triggerType,
    triggeredBy: userId,
    stages: input.stages,
    baseUrl: input.baseUrl,
  });
  res.status(201).json({ success: true, data: run });
}));

// GET /runs — List runs for tenant
router.get('/runs', authenticate, requirePermission('quality-gate.run.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const query = listRunsQuery.parse(req.query);
  const result = await runService.listRuns(tenantId, { page: query.page, limit: query.limit, status: query.status });
  res.json({ success: true, data: result.rows, meta: { total: result.total, page: query.page, limit: query.limit } });
}));

// GET /runs/latest — Most recent run
router.get('/runs/latest', authenticate, requirePermission('quality-gate.run.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const run = await runService.getLatestRun(tenantId);
  if (!run) { res.status(404).json({ success: false, error: 'No quality gate runs found' }); return; }
  res.json({ success: true, data: run });
}));

// GET /runs/:runId — Get run with stages
router.get('/runs/:runId', authenticate, requirePermission('quality-gate.run.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const result = await runService.getRunWithStages(tenantId, req.params.runId);
  if (!result) { res.status(404).json({ success: false, error: 'Run not found' }); return; }
  res.json({ success: true, data: result });
}));

// GET /runs/:runId/stages — Get stage results
router.get('/runs/:runId/stages', authenticate, requirePermission('quality-gate.run.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const result = await runService.getRunWithStages(tenantId, req.params.runId);
  if (!result) { res.status(404).json({ success: false, error: 'Run not found' }); return; }
  res.json({ success: true, data: result.stages });
}));

// POST /runs/:runId/override — Override failing run
router.post('/runs/:runId/override', authenticate, requirePermission('quality-gate.run.override'), validate(createOverrideBody), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;
  const input = overrideRunBody.parse(req.body);
  await runService.overrideRun(tenantId, req.params.runId, userId, input.reason);
  res.json({ success: true, data: { message: 'Run overridden' } });
}));

// ═══════════════════════════════════════════════════════════════
// Thresholds
// ═══════════════════════════════════════════════════════════════

// GET /thresholds — Get merged thresholds (defaults + tenant overrides)
router.get('/thresholds', authenticate, requirePermission('quality-gate.threshold.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const thresholds = await runService.getThresholds(tenantId);
  res.json({ success: true, data: thresholds });
}));

// PUT /thresholds/:stageCode — Update tenant threshold
router.put('/thresholds/:stageCode', authenticate, requirePermission('quality-gate.threshold.write'), validate(updateThresholdsBody), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;
  const input = updateThresholdBody.parse(req.body);
  await runService.updateThreshold(tenantId, req.params.stageCode, input.metricCode, input.minValue, userId, input.overrideReason);
  res.json({ success: true, data: { message: 'Threshold updated' } });
}));

// ═══════════════════════════════════════════════════════════════
// Schema Drift
// ═══════════════════════════════════════════════════════════════

// GET /drift — Drift findings for tenant
router.get('/drift', authenticate, requirePermission('quality-gate.drift.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const query = driftQuery.parse(req.query);
  const findings = await driftService.getDriftFindings(tenantId, { severity: query.severity });
  res.json({ success: true, data: findings });
}));

// POST /drift/resolve/:driftId — Resolve drift finding
router.post('/drift/resolve/:driftId', authenticate, requirePermission('quality-gate.drift.read'), validate(createResolveBody), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;
  await driftService.resolveDrift(tenantId, req.params.driftId, userId);
  res.json({ success: true, data: { message: 'Drift resolved' } });
}));

// ═══════════════════════════════════════════════════════════════
// AI Eval
// ═══════════════════════════════════════════════════════════════

// GET /ai-eval — AI guardrail evaluation history
router.get('/ai-eval', authenticate, requirePermission('quality-gate.ai-eval.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const query = aiEvalQuery.parse(req.query);
  const history = await aiEvalService.getAiEvalHistory(tenantId, { agentId: query.agentId });
  res.json({ success: true, data: history });
}));

// ═══════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════

// GET /dashboard/summary
router.get('/dashboard/summary', authenticate, requirePermission('quality-gate.run.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const summary = await dashService.getDashboardSummary(tenantId);
  res.json({ success: true, data: summary });
}));

// GET /dashboard/trends
router.get('/dashboard/trends', authenticate, requirePermission('quality-gate.run.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const query = trendsQuery.parse(req.query);
  const trends = await dashService.getDashboardTrends(tenantId, query.days);
  res.json({ success: true, data: trends });
}));

// GET /dashboard/health
router.get('/dashboard/health', authenticate, requirePermission('quality-gate.run.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const health = await dashService.getDashboardHealth(tenantId);
  res.json({ success: true, data: health });
}));

export default router;
