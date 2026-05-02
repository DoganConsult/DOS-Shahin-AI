import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Workflow Template Routes
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { getWorkflowTemplates, getWorkflowTemplatesFromDB, instantiateTemplate } from '../../services/templates/workflow-templates.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { z as _z } from 'zod';


// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createInstantiateBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("workflows"));
router.use(automationMiddleware("workflows"));

router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("workflow.instance.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    let templates = getWorkflowTemplates();
    if (tenantId) {
      try {
        templates = await getWorkflowTemplatesFromDB(tenantId);
      } catch { /* fallback to in-memory only */ }
    }
    res.json(templates);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/workflow-templates/instantiate — Create workflow from template
router.post("/instantiate", authenticate, requirePermission("workflow.instance.write"), validate({ body: createInstantiateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId!;
    const { templateKey, params } = req.body;
    if (!templateKey) {
      res.status(400).json({ error: "templateKey is required" });
      return;
    }
    const workflow = await instantiateTemplate(tenantId, templateKey, params || {}, userId);

    setAuditData(res as any, { action: "create", entityType: "workflow-template", entityId: workflow.workflowId || templateKey, afterState: workflow });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflow_templates', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:workflows.workflow_templates.created' });
    res.status(201).json(workflow);
  } catch (err: unknown) {
    if (toErrorMessage(err).startsWith("Unknown template")) {
      res.status(400).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

