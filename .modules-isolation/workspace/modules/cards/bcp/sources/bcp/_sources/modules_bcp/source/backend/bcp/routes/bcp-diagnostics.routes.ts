import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Bcp Diagnostics Routes
 * @owner bcp
 * @module bcp
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { BcpDiagnosticsService } from '../diagnostics/bcp-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('bcp'));
router.use(auditMiddleware('bcp'));

const diagnostics = new BcpDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('bcp.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
