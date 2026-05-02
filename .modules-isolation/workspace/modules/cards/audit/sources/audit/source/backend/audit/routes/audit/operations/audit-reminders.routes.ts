import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getUpcomingDeadlines,
  generateReminders,
} from '../../../services/audit/operations/audit-reminders.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const generateRemindersBody = z.object({}).passthrough();

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET /upcoming - Get upcoming reminders (query param: daysAhead, default 7)
router.get("/upcoming", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const daysAhead = parseInt(req.query.daysAhead as string, 10) || 7;
  const result = await getUpcomingDeadlines(tenantId, daysAhead);
  res.json(result);
});

// POST /generate - Generate reminders
router.post("/generate", authenticate, requirePermission("audit.record.manage"), validate({ body: generateRemindersBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await generateReminders(tenantId);
  setAuditData(res as any, { action: "create", entityType: "reminder_generation", afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_reminders', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_reminders.created' });
  res.status(201).json(result);
});

export default router;

