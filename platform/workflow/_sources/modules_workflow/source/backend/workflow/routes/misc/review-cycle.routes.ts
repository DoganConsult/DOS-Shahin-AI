import { Request, Response, Router } from 'express';
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
// ============================================
// Platform — Review Cycle Routes
// Review cycle engine: overdue checks and calendar
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { toErrorMessage } from '@dos/module-sdk';
import {

  checkReviewCycles,
  getReviewCalendar,
} from "../../../workflow/services/approvals/review-cycle-engine.service";
import { validate } from "../ports/middleware.port";
import { z } from "zod";

const router = Router();

// GET /check — Check for overdue review cycles and trigger notifications
router.get("/check", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const dueItems = await checkReviewCycles(tenantId);
    res.json({ dueItems, count: dueItems.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /calendar — Get upcoming review calendar
router.get("/calendar", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const calendar = await getReviewCalendar(tenantId);
    res.json({ items: calendar, count: calendar.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
