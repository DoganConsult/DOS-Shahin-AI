import { Request, Response, Router } from 'express';
import { z } from "zod";
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import { auditMiddleware } from '../../ports/middleware.port';
/**
 * Maturity Extended API Routes — AI-Guided GRC Partner
 *
 * 3 endpoints for maturity scores, trends, and health reports.
 * Requirements: 10.1, 10.2, 10.5
 */


import { authenticate, requirePermission } from '../../ports/auth.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  getLatestMaturity,
  getMaturityHistory,
  generateExecutiveSummary,
} from '../../ports/platform.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(auditMiddleware("compliance"));

function getTenantUser(req: Request): { tenantId: string; userId: string } {
  const user = req.user!;
  return { tenantId: user.tenantId, userId: user.userId };
}

// GET /api/maturity-ext/scores — Get all domain maturity scores
router.get('/scores', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('maturity.assessment.read'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUser(req);
    const maturity = await getLatestMaturity(tenantId);
    if (!maturity) {
      res.json({ overall: 0, components: [], computedAt: new Date().toISOString() });
      return;
    }
    res.json(maturity);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/maturity-ext/trends — Get maturity trends over time
router.get('/trends', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('maturity.assessment.read'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUser(req);
    const history = await getMaturityHistory(tenantId);
    res.json({ trends: history });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/maturity-ext/health-report — Generate health report
router.get('/health-report', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('maturity.assessment.read'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUser(req);
    const summary = await generateExecutiveSummary(tenantId);
    res.json(summary);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
