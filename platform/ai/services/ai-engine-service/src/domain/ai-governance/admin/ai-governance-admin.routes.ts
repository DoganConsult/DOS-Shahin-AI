import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getAiGovernanceDiagnostics, getRegistryIntegrityDiagnostics, getMissingDocumentationDiagnostics } from '../diagnostics/ai-governance-diagnostics.service';
import { getAiGovernanceDashboard, getAiDpiaStatusSummary } from '../services/ai/operations/ai-governance-dashboard.service';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai_governance'));

router.get(
  '/settings',
  authenticate,
  requirePermission('ai_governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['ai-governance'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('ai_governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const diagnostics = await getAiGovernanceDiagnostics(tenantId);
    const healthy =
      diagnostics.suspendedSystems === 0 &&
      diagnostics.expiredDpias === 0 &&
      diagnostics.overdueReviews === 0;
    res.json({ success: true, healthy, diagnostics });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('ai_governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const diagnostics = await getAiGovernanceDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics });
  }),
);

router.get(
  '/diagnostics/registry-integrity',
  authenticate,
  requirePermission('ai_governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 30);
    const issues = await getRegistryIntegrityDiagnostics(tenantId, limit);
    res.json({ success: true, data: issues, total: issues.length });
  }),
);

router.get(
  '/diagnostics/missing-documentation',
  authenticate,
  requirePermission('ai_governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 30);
    const issues = await getMissingDocumentationDiagnostics(tenantId, limit);
    res.json({ success: true, data: issues, total: issues.length });
  }),
);

router.get(
  '/overview',
  authenticate,
  requirePermission('ai_governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const [systems, policies] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'deployed')::int AS deployed,
           COUNT(*) FILTER (WHERE risk_level IN ('high', 'unacceptable'))::int AS high_risk
         FROM "${schema}".ai_system_registry WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, deployed: 0, high_risk: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active
         FROM "${schema}".ai_governance_policies WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
    ]);
    res.json({
      success: true,
      data: {
        totalSystems: systems.rows[0]?.total ?? 0,
        deployedSystems: systems.rows[0]?.deployed ?? 0,
        highRiskSystems: systems.rows[0]?.high_risk ?? 0,
        totalPolicies: policies.rows[0]?.total ?? 0,
        activePolicies: policies.rows[0]?.active ?? 0,
      },
    });
  }),
);

router.get(
  '/dashboard',
  authenticate,
  requirePermission('ai_governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const dashboard = await getAiGovernanceDashboard(tenantId);
    res.json({ success: true, data: dashboard });
  }),
);

router.get(
  '/dashboard/dpia-status',
  authenticate,
  requirePermission('ai_governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const data = await getAiDpiaStatusSummary(tenantId);
    res.json({ success: true, data, total: data.length });
  }),
);

export default router;
