import { Request, Response, Router } from 'express';
import { z } from "zod";
/**
 * Framework Harmonization Routes
 * 
 * API endpoints for cross-regulatory harmonization analysis
 */


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { auditMiddleware, setAuditData, automationMiddleware, validate } from '../../../ports/middleware.port';
import {
  computeFrameworkOverlapMatrix,
  identifySharedRequirements,
  identifyUniqueRequirements,
  identifyDomainOverlaps,
  performHarmonizationAnalysis,
  getTenantHarmonizationAnalysis,
} from '../../../compliance/services/misc/framework-harmonization.service';
import { toErrorMessage } from '@dos/module-sdk';
// validate imported above from the canonical ports/middleware.port
const router = Router();
router.use(auditMiddleware('framework-harmonization'));
router.use(automationMiddleware('compliance'));

/**
 * GET /api/framework-harmonization/overlap-matrix
 * Compute framework overlap matrix
 */
router.get(
  '/overlap-matrix', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    try {
      const frameworkIds = req.query.frameworks
        ? (req.query.frameworks as string).split(',').filter(Boolean)
        : undefined;

      const matrix = computeFrameworkOverlapMatrix(frameworkIds);
      res.json(matrix);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

/**
 * GET /api/framework-harmonization/shared-requirements
 * Identify shared requirements across frameworks
 */
router.get(
  '/shared-requirements', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    try {
      const minFrameworkCount = req.query.minFrameworks
        ? parseInt(req.query.minFrameworks as string, 10)
        : 2;

      const shared = identifySharedRequirements(minFrameworkCount);
      res.json({
        requirements: shared,
        count: shared.length,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

/**
 * GET /api/framework-harmonization/unique-requirements
 * Identify unique requirements (framework-specific)
 */
router.get(
  '/unique-requirements', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    try {
      const framework = req.query.framework as string | undefined;
      const unique = identifyUniqueRequirements();

      const filtered = framework
        ? unique.filter(r => r.framework === framework)
        : unique;

      res.json({
        requirements: filtered,
        count: filtered.length,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

/**
 * GET /api/framework-harmonization/domain-overlaps
 * Identify domain-level overlaps
 */
router.get(
  '/domain-overlaps', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    try {
      const overlaps = identifyDomainOverlaps();
      res.json({
        overlaps,
        count: overlaps.length,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

/**
 * GET /api/framework-harmonization/analysis
 * Perform comprehensive harmonization analysis
 */
router.get(
  '/analysis', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    try {
      const frameworkIds = req.query.frameworks
        ? (req.query.frameworks as string).split(',').filter(Boolean)
        : undefined;

      const includeDbMappings = req.query.includeDbMappings === 'true';

      let analysis;
      if (includeDbMappings && req.tenantId) {
        analysis = await getTenantHarmonizationAnalysis(req.tenantId, frameworkIds);
      } else {
        analysis = performHarmonizationAnalysis(frameworkIds);
      }

      setAuditData(res as any, {
        action: 'read',
        entityType: 'harmonization_analysis',
        entityId: 'all',
      });

      res.json(analysis);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

export default router;
