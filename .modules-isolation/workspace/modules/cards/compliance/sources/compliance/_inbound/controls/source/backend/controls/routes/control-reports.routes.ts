import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// AGRC-OS — Control Reports Routes
// Report catalog, on-demand report generation,
// and executive controls pack.
// ============================================


import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, automationMiddleware, fieldRbacFilter, validate } from '../ports/middleware.port';
import { ControlReportingService } from "../services/control-reporting.service";
import { runReportBody } from "../schemas/controls.schemas";

const router = Router();

/**
 * GET /api/controls/reports/catalog
 *
 * List available report types with metadata
 * (name, description, supported formats, parameters).
 */
router.get(
  "/catalog",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const _tenantId = req.tenantId;
    const svc = new ControlReportingService();
    const result = await svc.getReportCatalog();
    res.json(result);
  })
);

/**
 * POST /api/controls/reports/run
 *
 * Generate a report on demand. Returns the report blob or a download URL.
 */
router.post(
  "/run",
  authenticate,
  requirePermission("controls.report"),
  validate({ body: runReportBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { reportType, filters } = req.body;
    const svc = new ControlReportingService();
    const buffer = await svc.runReport(tenantId, reportType, filters);
    setAuditData(res as any, { action: 'generate', entityType: 'control_report', entityId: reportType });

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${reportType}-report"`);
    res.send(buffer);
  })
);

/**
 * GET /api/controls/reports/executive-pack
 *
 * Generate the executive controls pack (summary view
 * suitable for board/management reporting).
 */
router.get(
  "/executive-pack",
  authenticate,
  requirePermission("controls.report"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlReportingService();
    const buffer = await svc.getExecutivePack(tenantId);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="executive-controls-pack"');
    res.send(buffer);
  })
);

export default router;

