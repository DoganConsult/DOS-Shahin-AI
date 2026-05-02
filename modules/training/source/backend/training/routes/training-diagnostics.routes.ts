import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Training Diagnostics Routes
 * @owner training
 * @module training
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { TrainingDiagnosticsService } from '../diagnostics/training-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('training'));
router.use(auditMiddleware('training'));

const diagnostics = new TrainingDiagnosticsService();

router.get('/diagnostics', authenticate, requirePermission('training.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await diagnostics.runDiagnostics(req.tenantId!);
  res.json({ success: true, data: result });
}));

export default router;
