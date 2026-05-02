import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listCoordinations,
  createCoordination,
  updateCoordination,
  getByAudit,
  deleteCoordination,
} from '../../../services/audit/operations/audit-external-coordination.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createCoordinationBody = z.object({
  auditId: z.string().min(1),
  externalParty: z.string().min(1),
}).passthrough();

const updateCoordinationBody = z.object({}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET / - List all external coordinations
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const items = await listCoordinations(tenantId);
  res.json({ items, count: items.length });
});

// POST / - Create external coordination
router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createCoordinationBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = req.body;
  const result = await createCoordination(tenantId, data);
  setAuditData(res as any, { action: "create", entityType: "external_coordination", entityId: result.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_external', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_external.created' });
  res.status(201).json(result);
});

// PUT /:id - Update external coordination
router.put("/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updateCoordinationBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const data = req.body;
  const result = await updateCoordination(tenantId, id, data);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "external_coordination", entityId: id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_external', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_external.updated' });
  res.json(result);
});

// GET /audit/:auditId - Get external coordinations by audit
router.get("/audit/:auditId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { auditId } = req.params;
  const items = await getByAudit(tenantId, auditId);
  res.json({ items, count: items.length });
});

// DELETE /:id - Delete external coordination
router.delete("/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("audit.record.manage"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const result = await deleteCoordination(tenantId, id);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  setAuditData(res as any, { action: "delete", entityType: "external_coordination", entityId: id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'deleted', entityType: 'audit_external', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_external.deleted' });
  res.json({ success: true });
});

export default router;

