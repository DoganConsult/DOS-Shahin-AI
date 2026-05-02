import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Portals Diagnostics Routes
 * @owner portals
 * @module portals
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { PortalsDiagnosticsService } from '../diagnostics/portals-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('portals'));
router.use(auditMiddleware('portals'));

const diagnostics = new PortalsDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
