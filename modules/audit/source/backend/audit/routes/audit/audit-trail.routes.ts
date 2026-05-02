import { Request, Response, Router } from 'express';
import { z } from "zod";
import { logger } from '../../ports/logger.port';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { queryAuditTrail, getAuditTrailTotal, exportAuditLog, getDistinctModules, recordAudit } from '../../services/audit/core/audit-trail.service';
import { toErrorMessage } from '@dos/module-sdk';

import { moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('audit'));

// GET /api/audit-trail — Query audit trail with filters
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const filters = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    module: req.query.module as string,
    userId: req.query.userId as string,
    action: req.query.action as string,
    entityType: req.query.entityType as string,
    entityId: req.query.entityId as string,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
  };

  const [entries, totalCount] = await Promise.all([
    queryAuditTrail(tenantId, filters),
    getAuditTrailTotal(tenantId, filters),
  ]);
  res.json({ entries, count: entries.length, totalCount });

  // Meta-audit: log who viewed the audit trail (anti-recursion guard)
  const isMetaQuery = filters.module === 'audit' && (filters.action === 'audit_log_view' || filters.action === 'audit_log_export');
  if (!isMetaQuery) {
    recordAudit({
      tenantId,
      userId: req.user!.userId!,
      module: 'audit',
      action: 'audit_log_view',
      entityType: 'audit_trail',
      entityId: '',
      afterState: { filters: { module: filters.module, action: filters.action, entityType: filters.entityType, startDate: filters.startDate, endDate: filters.endDate } },
    }).catch(err => logger.error('[Audit] meta-audit view:', toErrorMessage(err)));
  }
});

// GET /api/audit-trail/modules — Distinct module names for dynamic filter
router.get("/modules", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const modules = await getDistinctModules(tenantId);
  res.json({ modules });
});

// GET /api/audit-trail/export — Export audit log with full filter support
router.get("/export", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const format = (req.query.format as "csv" | "json") || "json";
  const filters = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    module: req.query.module as string,
    userId: req.query.userId as string,
    action: req.query.action as string,
    entityType: req.query.entityType as string,
    entityId: req.query.entityId as string,
  };

  const buffer = await exportAuditLog(tenantId, filters, format);
  const contentType = format === "csv" ? "text/csv" : "application/json";
  const ext = format === "csv" ? "csv" : "json";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename=audit-trail.${ext}`);
  res.send(buffer);

  // Meta-audit: log who exported the audit trail
  recordAudit({
    tenantId,
    userId: req.user!.userId!,
    module: 'audit',
    action: 'audit_log_export',
    entityType: 'audit_trail',
    entityId: '',
    afterState: { format, filters },
  }).catch(err => logger.error('[Audit] meta-audit export:', toErrorMessage(err)));
});

export default router;
