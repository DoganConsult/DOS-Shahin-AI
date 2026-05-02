import { Request, Response, NextFunction as _NextFunction, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';
import { moduleStack } from '../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('vendor'));

router.get("/scorecard", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getScorecardReport } = await import("../services/vendor/vendor-reports.service.js");
  res.json(await getScorecardReport(req.tenantId!));
});

router.get("/concentration", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getConcentrationReport } = await import("../services/vendor/vendor-reports.service.js");
  res.json(await getConcentrationReport(req.tenantId!));
});

router.get("/risk-tiers", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getRiskTierDistribution } = await import("../services/vendor/vendor-reports.service.js");
  res.json(await getRiskTierDistribution(req.tenantId!));
});

router.get("/dd-completion", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getDDCompletionRates } = await import("../services/vendor/vendor-reports.service.js");
  res.json(await getDDCompletionRates(req.tenantId!));
});

router.get("/sla-performance", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getSLAPerformance } = await import("../services/vendor/vendor-reports.service.js");

  const months = req.query.months ? parseInt(req.query.months, 10) : 6;
  res.json(await getSLAPerformance(req.tenantId!, months));
});

router.get("/fourth-party", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getFourthPartyExposure } = await import("../services/vendor/vendor-reports.service.js");
  res.json(await getFourthPartyExposure(req.tenantId!));
});

router.get("/trends", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getTrendAnalysis } = await import("../services/vendor/vendor-reports.service.js");

  const months = req.query.months ? parseInt(req.query.months, 10) : 12;
  res.json(await getTrendAnalysis(req.tenantId!, months));
});

export default router;
