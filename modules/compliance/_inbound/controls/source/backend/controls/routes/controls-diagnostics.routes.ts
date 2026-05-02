import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Controls Diagnostics Routes
 * @owner controls
 * @module controls
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { ControlsDiagnosticsService } from '../diagnostics/controls-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('controls'));
router.use(auditMiddleware('controls'));

const diagnostics = new ControlsDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('controls.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
