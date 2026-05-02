import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
} from '../../../services/audit/planning/audit-templates.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createTemplateBody = z.object({
  name: z.string().min(1),
  templateType: z.string().min(1),
}).passthrough();

const updateTemplateBody = z.object({}).passthrough();

const applyTemplateBody = z.object({
  auditId: z.string().min(1),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// GET / - List all templates
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const items = await listTemplates(tenantId);
  res.json({ items, count: items.length });
});

// GET /:id - Get template by ID
router.get("/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const result = await getTemplateById(tenantId, id);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(result);
});

// POST / - Create template
router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createTemplateBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const data = req.body;
  const result = await createTemplate(tenantId, data);
  setAuditData(res as any, { action: "create", entityType: "audit_template", entityId: result.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_templates.created' });
  res.status(201).json(result);
});

// PUT /:id - Update template
router.put("/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updateTemplateBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const data = req.body;
  const result = await updateTemplate(tenantId, id, data);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "audit_template", entityId: id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_templates.updated' });
  res.json(result);
});

// DELETE /:id - Delete template
router.delete("/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("audit.record.manage"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const result = await deleteTemplate(tenantId, id);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'deleted', entityType: 'audit_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_templates.deleted' });
  res.json({ success: true });
});

// POST /:id/apply - Apply template to an audit
router.post("/:id/apply", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: applyTemplateBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;
  const { auditId } = req.body;
  const result = await applyTemplate(tenantId, id, auditId);
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "audit_template", entityId: id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_templates.created' });
  res.json(result);
});

export default router;

