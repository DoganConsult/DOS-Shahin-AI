import { Request, Response, Router } from 'express';
import { z } from "zod";
/**
 * Jurisdiction Framework Routes — Pillar 6: Multi-Jurisdiction Support
 *
 * Provides endpoints for browsing frameworks across jurisdictions,
 * cross-framework control mappings, and gap analysis.
 */


import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getFrameworksByJurisdiction,
  getFrameworkByCode,
  getFrameworksBySector,
  getFrameworksByCategory,
  crossJurisdictionGapAnalysis,
  getControlMappings,
} from '../../../ksa-regulatory/services/jurisdiction-registry.service';
import { validate } from '../../../ports/middleware.port';
const router = Router();

router.use(authenticate);

router.get('/frameworks', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), (req: Request, res: Response) => {
  const { jurisdiction, sector, category } = req.query;
  if (jurisdiction) return res.json(getFrameworksByJurisdiction(String(jurisdiction)));
  if (sector) return res.json(getFrameworksBySector(String(sector)));
  if (category) return res.json(getFrameworksByCategory(String(category)));
  return res.json(getFrameworksByJurisdiction());
});

router.get('/frameworks/:code', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), (req: Request, res: Response) => {
  const fw = getFrameworkByCode(req.params.code);
  if (!fw) return res.status(404).json({ error: 'Framework not found' });
  return res.json(fw);
});

router.get('/frameworks/:code/mappings', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), (req: Request, res: Response) => {
  return res.json(getControlMappings(req.params.code));
});

router.get('/gap-analysis/:jurisdiction', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), async (req: Request, res: Response) => {
  try {
    const result = await crossJurisdictionGapAnalysis(req.tenantId!, req.params.jurisdiction);
    return res.json(result);
  } catch (e: unknown) {
    return res.status(500).json({ error: (e instanceof Error ? e.message : String(e)) });
  }
});

export default router;
