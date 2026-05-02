import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listRequirements,
  createRequirement,
  updateRequirement,
  getOverdueItems,
  linkToAudit,
} from '../../../services/audit/operations/audit-regulatory-tracking.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createRequirementBody = z.object({
  title: z.string().min(1),
  regulatoryBody: z.string().min(1),
}).passthrough();

const updateRequirementBody = z.object({}).passthrough();

const linkAuditBody = z.object({
  auditId: z.string().min(1),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET / - List all regulatory trackings
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const items = await listRequirements(tenantId);
  res.json({ items, count: items.length });
});

// POST / - Create regulatory tracking
router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createRequirementBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = req.body;
  const result = await createRequirement(tenantId, data);
  setAuditData(res as any, { action: "create", entityType: "regulatory_tracking", entityId: result.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_regulatory', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_regulatory.created' });
  res.status(201).json(result);
});

// PUT /:id - Update regulatory tracking
router.put("/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updateRequirementBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const data = req.body;
  const result = await updateRequirement(tenantId, id, data);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "regulatory_tracking", entityId: id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_regulatory', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_regulatory.updated' });
  res.json(result);
});

// GET /overdue - Get overdue regulatory trackings
router.get("/overdue", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const items = await getOverdueItems(tenantId);
  res.json({ items, count: items.length });
});

// POST /:id/link-audit - Link an audit to a regulatory tracking
router.post("/:id/link-audit", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: linkAuditBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const { auditId } = req.body;
  const result = await linkToAudit(tenantId, id, auditId);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "regulatory_tracking", entityId: id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_regulatory', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_regulatory.created' });
  res.json(result);
});

export default router;

