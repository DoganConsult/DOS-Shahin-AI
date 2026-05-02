import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// AGRC-OS — Control Work Queue Routes
// Returns user-scoped work queue items:
// assigned tests, reviews, evidence, certifications,
// deficiency actions, and monitoring alerts.
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, automationMiddleware as _automationMiddleware, fieldRbacFilter } from '../ports/middleware.port';
import { ControlWorkQueueService } from "../services/control-work-queue.service";
import { validate } from "../ports/middleware.port";
const router = Router();

/**
 * GET /api/controls/work-queue
 *
 * Returns user-scoped work queue: tests assigned, controls awaiting review,
 * evidence pending, certifications pending, deficiencies awaiting action,
 * and monitoring alerts.
 */
router.get(
  "/",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "User identity required" });
      return;
    }

    const svc = new ControlWorkQueueService();
    const result = await svc.getWorkQueue(tenantId, userId);
    res.json(result);
  })
);

export default router;
