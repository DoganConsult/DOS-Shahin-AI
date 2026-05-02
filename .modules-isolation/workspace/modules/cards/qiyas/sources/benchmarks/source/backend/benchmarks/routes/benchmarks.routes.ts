// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, validate, asyncHandler, setAuditData } from '../ports/benchmarks.ports';
import * as service from '../services/benchmarks.service';
import { CreateBenchmarkSchema, CreateMappingSchema, ComputeScoreSchema } from '../schemas/benchmarks.schemas';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

const router = Router();

// §6: /api/benchmarks/catalog
router.get('/catalog', authenticate, requirePermission('benchmarks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listBenchmarks(req.tenantId);
  res.json({ data });
}));

router.post('/catalog', authenticate, requirePermission('benchmarks.manage'), validate({ body: CreateBenchmarkSchema }), asyncHandler(async (req: any, res: any) => {
  const benchmark = await service.createBenchmark(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'benchmark', entityId: benchmark.id, afterState: benchmark });
  res.status(201).json({ data: benchmark });
}));

// §6: /api/benchmarks/mappings
router.get('/mappings/:benchmarkId', authenticate, requirePermission('benchmarks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.listMappings(req.tenantId, req.params.benchmarkId);
  res.json({ data });
}));

router.post('/mappings', authenticate, requirePermission('benchmarks.manage'), validate({ body: CreateMappingSchema }), asyncHandler(async (req: any, res: any) => {
  const mapping = await service.createMapping(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'benchmark_mapping', entityId: mapping.id, afterState: mapping });
  res.status(201).json({ data: mapping });
}));

// §6: /api/benchmarks/scoring
router.get('/scoring/:benchmarkId', authenticate, requirePermission('benchmarks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.getScores(req.tenantId, req.params.benchmarkId);
  res.json({ data });
}));

router.post('/scoring', authenticate, requirePermission('benchmarks.manage'), validate({ body: ComputeScoreSchema }), asyncHandler(async (req: any, res: any) => {
  const score = await service.computeScore(req.tenantId, req.body.benchmarkId, req.body.computationMethod);
  setAuditData(res, { action: 'create', entityType: 'benchmark_score', entityId: score.id, afterState: score });
  res.status(201).json({ data: score });
}));

// §6: /api/benchmarks/peers
router.get('/peers/:benchmarkId', authenticate, requirePermission('benchmarks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.getPeerData(req.tenantId, req.params.benchmarkId);
  res.json({ data });
}));

// §6: /api/benchmarks/diagnostics
router.get('/diagnostics', authenticate, requirePermission('benchmarks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const data = await service.runDiagnostics(req.tenantId);
  res.json({ data });
}));

export default router;

