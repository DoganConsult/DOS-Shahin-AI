import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// AGRC-OS — Control Detail Routes
// Returns aggregated detail for a single control
// including owners, mappings, tests, deficiencies,
// monitoring, evidence, and activity log.
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, automationMiddleware as _automationMiddleware, fieldRbacFilter } from '../ports/middleware.port';
import { ControlDetailService } from "../services/control-detail.service";
import { validate } from "../ports/middleware.port";
const router = Router();

/**
 * GET /api/controls/:id/detail
 *
 * Returns aggregated control detail: control record + owners +
 * mapped risks count + mapped obligations count + mapped policies count +
 * test history + open deficiencies + monitoring status + evidence sources +
 * activity log.
 */
router.get(
  "/",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const controlId = req.params.id;

    if (!controlId) {
      res.status(400).json({ error: "Control ID is required" });
      return;
    }

    const svc = new ControlDetailService();
    const result = await svc.getControlDetail(tenantId, controlId);
    res.json(result);
  })
);

export default router;
