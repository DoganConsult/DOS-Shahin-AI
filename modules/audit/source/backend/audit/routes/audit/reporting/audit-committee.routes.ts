import { Request, Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../../../ports/auth.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  generateExecutiveSummary,
  getCommitteeMetrics,
  getBoardDashboard,
} from '../../../services/audit/reporting/audit-committee-reporting.service.js';

import { auditMiddleware, setAuditData as _setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET /executive-summary - Get executive summary for audit committee
router.get("/executive-summary", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await generateExecutiveSummary(tenantId);
  res.json(result);
});

// GET /metrics - Get committee metrics
router.get("/metrics", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await getCommitteeMetrics(tenantId);
  res.json(result);
});

// GET /board-dashboard - Get board-level dashboard data
router.get("/board-dashboard", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await getBoardDashboard(tenantId);
  res.json(result);
});

export default router;
