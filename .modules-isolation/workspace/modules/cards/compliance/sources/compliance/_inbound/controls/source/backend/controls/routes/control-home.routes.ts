import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// AGRC-OS — Control Home Routes
// Returns aggregated KPIs for the Controls
// module home page.
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, automationMiddleware as _automationMiddleware, fieldRbacFilter } from '../ports/middleware.port';
import { ControlHomeService } from "../services/control-home.service";
import { validate } from "../ports/middleware.port";
const router = Router();

/**
 * GET /api/controls/home
 *
 * Returns home-page KPIs: total active controls, key controls count,
 * failed tests this period, overdue tests, open deficiencies,
 * certifications due, automation mix, unmapped controls, health trend,
 * and recent alerts.
 */
router.get(
  "/",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlHomeService();
    const result = await svc.getHomeKpis(tenantId);
    res.json(result);
  })
);

export default router;
