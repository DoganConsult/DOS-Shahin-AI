import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Workflow Extension Routes
// Predefined templates, instantiation, activation
// Requirements: 9.2, 9.6
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  instantiateTemplateLegacy,
  validateWorkflowConfig,
} from '../../services/ops/workflow-ext.service';
import { getWorkflowTemplates } from '../../services/templates/workflow-templates.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { z as _z } from 'zod';


// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';
import { createWorkflowtemplatesidInstantiateBody, createWorkflowsidActivateBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("workflows"));
router.use(automationMiddleware("workflows"));

// GET /api/workflow-ext/workflow-templates — Return predefined templates
router.get("/workflow-templates", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("workflow.instance.read"), async (_req: Request, res: Response) => {
  try {
    const templates = getWorkflowTemplates();
    res.json({ templates, count: templates.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/workflow-ext/workflow-templates/:id/instantiate — Create workflow from template (admin only)
router.post(
  "/workflow-templates/:id/instantiate", authenticate, requirePermission("workflow.instance.execute"), validate({ body: createWorkflowtemplatesidInstantiateBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const templateId = req.params.id;
      if (!templateId) {
        res.status(400).json({ error: "Template ID is required" });
        return;
      }
      const result = await instantiateTemplateLegacy(tenantId, templateId, req.body || {});

      setAuditData(res as any, { action: "create", entityType: "workflow", entityId: result.workflowId || templateId, afterState: result });

      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'workflows', event: 'instantiated', entityType: 'workflow', entityId: result.workflowId || templateId, data: result } as any)), { tenantId: tenantId, operation: 'grcEvent:workflows.workflow.instantiated' });
      res.status(201).json(result);
    } catch (err: unknown) {
      const status = toErrorMessage(err).includes("not found") ? 404 : 500;
      res.status(status).json({ error: toErrorMessage(err) });
    }
  }
);

// POST /api/workflow-ext/workflows/:id/activate — Validate config and activate workflow (admin only)
router.post(
  "/workflows/:id/activate", authenticate, requirePermission("workflow.instance.write"), validate({ body: createWorkflowsidActivateBody }),
  async (req: Request, res: Response) => {
    try {
      const config = req.body;
      if (!config || typeof config !== "object") {
        res.status(400).json({ error: "Workflow configuration is required" });
        return;
      }

      const validation = validateWorkflowConfig(config);
      if (!validation.valid) {
        res.status(400).json({ valid: false, errors: validation.errors });
        return;
      }

      // Config is valid — mark workflow as activated
      setAuditData(res as any, { action: "update", entityType: "workflow", entityId: req.params.id, afterState: { valid: true, workflowId: req.params.id, status: "activated" } });
      emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'completed', entityType: 'workflow', entityId: req.params.id, data: { status: 'activated' } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
      res.json({ valid: true, workflowId: req.params.id, status: "activated" });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

export default router;

