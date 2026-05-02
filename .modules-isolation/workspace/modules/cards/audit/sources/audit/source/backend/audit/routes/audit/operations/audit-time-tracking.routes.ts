import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listEntries,
  logTime,
  getEfficiencyMetrics,
  getUtilization,
} from '../../../services/audit/execution/audit-time-tracking.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const logTimeBody = z.object({
  auditId: z.string().min(1),
  userId: z.string().min(1),
  hours: z.number().positive(),
}).passthrough();

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET /audit/:auditId - Get time tracking entries by audit
router.get("/audit/:auditId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { auditId } = req.params;
  const items = await listEntries(tenantId, auditId);
  res.json({ items, count: items.length });
});

// POST / - Create time entry
router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: logTimeBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = req.body;
  const result = await logTime(tenantId, data);
  setAuditData(res as any, { action: "create", entityType: "time_entry", entityId: result.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_time_tracking', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_time_tracking.created' });
  res.status(201).json(result);
});

// GET /efficiency - Get efficiency metrics
router.get("/efficiency", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await getEfficiencyMetrics(tenantId);
  res.json(result);
});

// GET /utilization - Get utilization metrics
router.get("/utilization", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await getUtilization(tenantId);
  res.json(result);
});

export default router;

