import { Request, Response, Router, NextFunction } from 'express';
/**
 * Compliance Workspace Routes — AGRC-OS
 * Mounted at /api/compliance-ws
 *
 * Barrel router that applies shared middleware and delegates to
 * domain-specific sub-routers. Route paths are unchanged.
 */


import { authenticate } from '../../../ports/auth.port';
import { metricsMiddleware } from '../../../ports/platform.port';
import { auditMiddleware, rateLimiter, automationMiddleware, moduleStack } from '../../../ports/middleware.port';

/* ── Sub-routers ─────────────────────────────────────────────────── */
import cwsOverviewRoutes from "../cws/cws-overview.routes";
import cwsFrameworksRoutes from "../cws/cws-frameworks.routes";
import cwsGapsRoadmapRoutes from "../cws/cws-gaps-roadmap.routes";
import cwsControlsFindingsRoutes from "../cws/cws-controls-findings.routes";
import cwsAssessmentsAuditRoutes from "../cws/cws-assessments-audit.routes";
import cwsRegulatoryRoutes from "../cws/cws-regulatory.routes";
import cwsPostureFoundationRoutes from "../cws/cws-posture-foundation.routes";

/* ── Rate limiters (shared across all sub-routers) ───────────────── */

const MINUTE_MS = 60_000;

const complianceOverviewLimiter = rateLimiter({
  windowMs: MINUTE_MS,
  maxRequests: 60,
  namespace: "compliance-overview",
  keyGenerator: (req) => req.tenantId || req.ip || req.socket?.remoteAddress || "any",
});

const complianceGeneralLimiter = rateLimiter({
  windowMs: MINUTE_MS,
  maxRequests: 120,
  namespace: "compliance-ws",
  keyGenerator: (req) => req.tenantId || req.ip || req.socket?.remoteAddress || "any",
});

function complianceRateLimit(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/overview") {
    complianceOverviewLimiter(req, res, next);
  } else {
    complianceGeneralLimiter(req, res, next);
  }
}

/* ── Main router with shared middleware ──────────────────────────── */

const router = Router();
router.use(moduleStack('compliance'));
router.use(metricsMiddleware());
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));
router.use(authenticate);
router.use(complianceRateLimit);

/* Mount sub-routers at "/" so their internal paths stay the same */
router.use("/", cwsOverviewRoutes);
router.use("/", cwsFrameworksRoutes);
router.use("/", cwsGapsRoadmapRoutes);
router.use("/", cwsControlsFindingsRoutes);
router.use("/", cwsAssessmentsAuditRoutes);
router.use("/", cwsRegulatoryRoutes);
router.use("/", cwsPostureFoundationRoutes);

export default router;
