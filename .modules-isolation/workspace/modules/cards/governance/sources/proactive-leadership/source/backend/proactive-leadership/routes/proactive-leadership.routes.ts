import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
/**
 * Proactive Leadership Routes — AGRC-OS
 *
 * Exposes leadership insights, evaluation triggers, and configuration
 * management for the proactive leadership module. All endpoints require
 * DAuth authentication and permission checks.
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';

import {
  getLeadershipInsights,
  runProactiveLeadershipCycle,
  getLeadershipDashboard,
} from '../services/proactive-leadership-engine.service';
import { createEvaluateBody, updateConfigBody } from '../schemas/proactive-leadership.schemas';
import {
  loadConfig,
  updateConfig,
} from '../services/proactive-leadership-config-loader.service';

const router = Router();
router.use(moduleStack('proactive_leadership'));
router.use(auditMiddleware('proactive_leadership'));

// GET /insights — List proactive leadership insights
router.get(
  '/insights',
  authenticate,
  requirePermission('proactive_leadership.insight.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = {
      days: Number(req.query.days) || 30,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      type: req.query.type as string | undefined,
      priority: req.query.priority as string | undefined,
      status: req.query.status as string | undefined,
    };
    const insights = await getLeadershipInsights(tenantId, filters);
    res.json(insights);
  }),
);

// GET /dashboard — Get the leadership dashboard summary
router.get(
  '/dashboard',
  authenticate,
  requirePermission('proactive_leadership.insight.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const dashboard = await getLeadershipDashboard(tenantId);
    res.json(dashboard);
  }),
);

// POST /evaluate — Trigger a proactive leadership evaluation cycle
router.post(
  '/evaluate',
  authenticate,
  requirePermission('proactive_leadership.evaluation.execute'),
  validate({ body: createEvaluateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const result = await runProactiveLeadershipCycle(tenantId);
    res.json(result);
  }),
);

// GET /config — Get current proactive leadership configuration
router.get(
  '/config',
  authenticate,
  requirePermission('proactive_leadership.config.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const config = await loadConfig(tenantId);
    res.json(config);
  }),
);

// PUT /config — Update proactive leadership configuration
router.put(
  '/config',
  authenticate,
  requirePermission('proactive_leadership.config.update'),
  validate({ body: updateConfigBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    const result = await updateConfig(tenantId, req.body, userId);
    res.json(result);
  }),
);

export default router;

