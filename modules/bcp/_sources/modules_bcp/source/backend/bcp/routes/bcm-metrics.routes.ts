import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import {
  getRecoveryMetrics, getRtoRpoTrend, getExerciseEffectiveness,
  getServiceResilienceScores, getRecoveryBenchmarks,
} from '../services/recovery-metrics.service';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('bcp'));
router.use(auditMiddleware("bcp"));

router.get("/recovery", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const metrics = await getRecoveryMetrics(req.tenantId!);
  res.json(metrics);
}));

router.get("/rto-rpo-trend", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const months = req.query.months ? Number(req.query.months) : 12;
  const trend = await getRtoRpoTrend(req.tenantId!, months);
  res.json(trend);
}));

router.get("/exercise-effectiveness", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const effectiveness = await getExerciseEffectiveness(req.tenantId!);
  res.json(effectiveness);
}));

router.get("/service-resilience", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const scores = await getServiceResilienceScores(req.tenantId!);
  res.json(scores);
}));

router.get("/benchmarks", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const benchmarks = await getRecoveryBenchmarks(req.tenantId!);
  res.json(benchmarks);
}));

export default router;
