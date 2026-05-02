import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Action Diagnostics Routes
 * @owner action
 * @module action
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { ActionDiagnosticsService } from '../diagnostics/action-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('action'));
router.use(auditMiddleware('action'));

const diagnostics = new ActionDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('action.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
