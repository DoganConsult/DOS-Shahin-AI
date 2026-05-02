import { Router, Request, Response, NextFunction as _NextFunction } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { moduleStack } from '../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('vendor'));

router.get("/kpis", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getDashboardKPIs } = await import("../services/vendor/vendor-dashboard.service.js");
  res.json(await getDashboardKPIs(req.tenantId!));
});

router.get("/work-queue", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getWorkQueue } = await import("../services/vendor/vendor-dashboard.service.js");
  res.json(await getWorkQueue(req.tenantId!, req.userId!));
});

router.get("/recent-activity", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getRecentActivity } = await import("../services/vendor/vendor-dashboard.service.js");

  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  res.json(await getRecentActivity(req.tenantId!, limit));
});

export default router;
