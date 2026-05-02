import { Request, Response, Router } from 'express';

/**
 * KSA Regulatory Routes — AGRC-OS
 *
 * Exposes KSA-specific regulatory intelligence, compliance scoring,
 * readiness assessment, sector maturity, and cross-framework mapping endpoints.
 * All endpoints require DAuth authentication and permission checks.
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';

import { getKsaRegulatoryIntelligence } from '../services/ksa-regulatory-intelligence.service';
import { computeKsaComplianceScore, getKsaComplianceScoreHistory } from '../services/ksa-compliance-scoring.service';
import { getKsaReadinessSummary } from '../services/ksa-readiness.service';
import { getSectorMaturityScore, getSectorBenchmark } from '../services/ksa-sector-maturity.service';
import { getCrossFrameworkMappings, computeFrameworkOverlap } from '../services/ksa-cross-framework-mapping.service';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

const router = Router();
router.use(moduleStack('ksa_regulatory'));
router.use(auditMiddleware('ksa_regulatory'));

// GET /intelligence — Retrieve KSA regulatory intelligence overview
router.get(
  '/intelligence',
  authenticate,
  requirePermission('ksa_regulatory.intelligence.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const result = await getKsaRegulatoryIntelligence(tenantId);
    res.json(result);
  }),
);

// GET /compliance-score — Get or compute KSA compliance score
router.get(
  '/compliance-score',
  authenticate,
  requirePermission('ksa_regulatory.compliance_score.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const score = await computeKsaComplianceScore(tenantId);
    res.json(score);
  }),
);

// GET /compliance-score/history — Get KSA compliance score history
router.get(
  '/compliance-score/history',
  authenticate,
  requirePermission('ksa_regulatory.compliance_score.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const frameworkCode = req.query.framework as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const timeRange = startDate && endDate ? { startDate, endDate } : undefined;
    const history = await getKsaComplianceScoreHistory(tenantId, frameworkCode, timeRange);
    res.json(history);
  }),
);

// GET /readiness — Get KSA readiness assessment summary
router.get(
  '/readiness',
  authenticate,
  requirePermission('ksa_regulatory.readiness.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const summary = await getKsaReadinessSummary(tenantId);
    res.json(summary);
  }),
);

// GET /sector-maturity — Get sector maturity score
router.get(
  '/sector-maturity',
  authenticate,
  requirePermission('ksa_regulatory.sector_maturity.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const score = await getSectorMaturityScore(tenantId);
    res.json(score);
  }),
);

// GET /sector-maturity/benchmark — Get sector benchmark comparison
router.get(
  '/sector-maturity/benchmark',
  authenticate,
  requirePermission('ksa_regulatory.sector_maturity.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const benchmark = await getSectorBenchmark(tenantId);
    res.json(benchmark);
  }),
);

// GET /framework-mapping — Get cross-framework control mappings
router.get(
  '/framework-mapping',
  authenticate,
  requirePermission('ksa_regulatory.framework_mapping.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const mappings = await getCrossFrameworkMappings(tenantId);
    res.json(mappings);
  }),
);

// GET /framework-mapping/overlap — Compute framework overlap analysis
router.get(
  '/framework-mapping/overlap',
  authenticate,
  requirePermission('ksa_regulatory.framework_mapping.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const frameworkA = req.query.frameworkA as string;
    const frameworkB = req.query.frameworkB as string;
    if (!frameworkA || !frameworkB) {
      res.status(400).json({ error: 'frameworkA and frameworkB query parameters are required' });
      return;
    }
    const overlap = await computeFrameworkOverlap(tenantId, frameworkA, frameworkB);
    res.json(overlap);
  }),
);

export default router;
