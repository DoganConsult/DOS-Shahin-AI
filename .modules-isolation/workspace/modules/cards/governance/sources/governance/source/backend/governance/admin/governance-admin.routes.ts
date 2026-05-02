import { Router, Request, Response } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getGovernanceDiagnostics } from '../diagnostics/governance-diagnostics.service';
import { getGovernanceDashboard, getCommitteeManagementSummary, getResponsibilityAssignmentSummary } from '../services/governance/governance-dashboard.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));

router.get(
  '/settings',
  authenticate,
  requirePermission('governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['governance'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const diagnostics = await getGovernanceDiagnostics(tenantId);
    const healthy =
      diagnostics.hierarchyHealth.orphanedBodies === 0 &&
      diagnostics.hierarchyHealth.bodiesWithoutOwner === 0 &&
      diagnostics.signOffHealth.blockedSignOffs === 0;
    res.json({ success: true, healthy, diagnostics });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('governance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const diagnostics = await getGovernanceDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics, capturedAt: new Date().toISOString() });
  }),
);

router.get(
  '/overview',
  authenticate,
  requirePermission('governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const [bodies, responsibilities, reviews] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active
         FROM "${schema}".governance_bodies WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
         FROM "${schema}".governance_responsibility_assignments WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, overdue: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('pending', 'in_review'))::int AS pending,
           COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
         FROM "${schema}".governance_reviews WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ pending: 0, blocked: 0 }] })),
    ]);
    res.json({
      success: true,
      data: {
        totalBodies: bodies.rows[0]?.total ?? 0,
        activeBodies: bodies.rows[0]?.active ?? 0,
        totalResponsibilities: responsibilities.rows[0]?.total ?? 0,
        overdueResponsibilities: responsibilities.rows[0]?.overdue ?? 0,
        pendingReviews: reviews.rows[0]?.pending ?? 0,
        blockedReviews: reviews.rows[0]?.blocked ?? 0,
      },
    });
  }),
);

router.get(
  '/dashboard',
  authenticate,
  requirePermission('governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const dashboard = await getGovernanceDashboard(tenantId);
    res.json({ success: true, data: dashboard });
  }),
);

router.get(
  '/dashboard/committees',
  authenticate,
  requirePermission('governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const data = await getCommitteeManagementSummary(tenantId);
    res.json({ success: true, data });
  }),
);

router.get(
  '/dashboard/responsibilities',
  authenticate,
  requirePermission('governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const data = await getResponsibilityAssignmentSummary(tenantId);
    res.json({ success: true, data });
  }),
);

export default router;
