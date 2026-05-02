import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getSlaConfig,
  upsertSla,
  getBreachedFindings,
  getSlaCompliance,
} from '../../../services/audit/findings/audit-finding-slas.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const upsertSlaBody = z.object({
  severity: z.string().min(1),
  resolutionDays: z.number().int().positive(),
  warningPct: z.number().optional(),
  escalationTo: z.string().optional(),
}).passthrough();

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET / - List all finding SLAs
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const items = await getSlaConfig(tenantId);
  res.json({ items, count: items.length });
});

// POST / - Create finding SLA
router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: upsertSlaBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = req.body;
  const result = await upsertSla(tenantId, data.severity, data.resolutionDays, data.warningPct, data.escalationTo);
  setAuditData(res as any, { action: "create", entityType: "finding_sla", afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_finding_slas', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_finding_slas.created' });
  res.status(201).json(result);
});

// GET /breached - Get breached SLAs
router.get("/breached", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const items = await getBreachedFindings(tenantId);
  res.json({ items, count: items.length });
});

// GET /compliance - Get SLA compliance stats
router.get("/compliance", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await getSlaCompliance(tenantId);
  res.json(result);
});

export default router;

