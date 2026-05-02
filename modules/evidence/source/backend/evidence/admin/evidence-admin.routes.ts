import { Router, Request, Response } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getEvidenceDiagnostics, getExpiredEvidenceDiagnostics, getFailedCollectionDiagnostics } from '../diagnostics/evidence-diagnostics.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware('evidence'));

router.get(
  '/settings',
  authenticate,
  requirePermission('evidence.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['evidence'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('evidence.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const diagnostics = await getEvidenceDiagnostics(tenantId);
    const healthy =
      diagnostics.expiredEvidence === 0 &&
      diagnostics.failedCollectionJobs === 0 &&
      diagnostics.overdueRequests === 0;
    res.json({ success: true, healthy, diagnostics });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('evidence.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const diagnostics = await getEvidenceDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics });
  }),
);

router.get(
  '/diagnostics/expired',
  authenticate,
  requirePermission('evidence.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
    const items = await getExpiredEvidenceDiagnostics(tenantId, limit);
    res.json({ success: true, data: items, total: items.length });
  }),
);

router.get(
  '/diagnostics/failed-collections',
  authenticate,
  requirePermission('evidence.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
    const items = await getFailedCollectionDiagnostics(tenantId, limit);
    res.json({ success: true, data: items, total: items.length });
  }),
);

router.get(
  '/overview',
  authenticate,
  requirePermission('evidence.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const [evidence, requests] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'collected')::int AS collected,
           COUNT(*) FILTER (WHERE status = 'expired')::int AS expired
         FROM "${schema}".evidence_links WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, collected: 0, expired: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS open,
           COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('fulfilled', 'cancelled'))::int AS overdue
         FROM "${schema}".evidence_requests WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ open: 0, overdue: 0 }] })),
    ]);
    res.json({
      success: true,
      data: {
        totalEvidence: evidence.rows[0]?.total ?? 0,
        collectedEvidence: evidence.rows[0]?.collected ?? 0,
        expiredEvidence: evidence.rows[0]?.expired ?? 0,
        openRequests: requests.rows[0]?.open ?? 0,
        overdueRequests: requests.rows[0]?.overdue ?? 0,
      },
    });
  }),
);

export default router;
