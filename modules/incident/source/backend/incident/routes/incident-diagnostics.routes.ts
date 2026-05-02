import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Incident Diagnostics Routes
 * @owner incident
 * @module incident
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { IncidentDiagnosticsService } from '../diagnostics/incident-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('incident'));
router.use(auditMiddleware('incident'));

const diagnostics = new IncidentDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('incident.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId);
  res.json({ success: true, data: result });
}));

export default router;
