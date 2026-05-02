import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { z as _z } from "zod";
import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  generateStepGuidance,
  generateStepAutofill,
  executeStepWithAgent,
  recordFeedback,
  getAIQueue,
  reviewAIStep,
  setUserAbsence,
  getAutonomousConfig,
  updateAutonomousConfig,
} from '../../services/ai/autonomous-workflow.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { autonomousConfigSchema, feedbackSchema, createAiExecuteBody, createReviewBody, updateAbsenceBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("workflows"));
router.use(automationMiddleware("workflows"));

router.get(
  "/workflows/:id/steps/:stepId/guidance", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("workflow.autonomous.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { id, stepId } = req.params;
      const guidance = await generateStepGuidance(tenantId, id, stepId);
      res.json(guidance);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.get(
  "/workflows/:id/steps/:stepId/autofill", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("workflow.autonomous.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { id, stepId } = req.params;
      const autofill = await generateStepAutofill(tenantId, id, stepId);
      res.json(autofill);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.post(
  "/workflows/:id/steps/:stepId/ai-execute",
  authenticate,
  requirePermission("workflow.autonomous.write"),
  validate({ body: createAiExecuteBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { id, stepId } = req.params;
      const { stepSubType, stepType, inputContext } = req.body;
      const result = await executeStepWithAgent(
        tenantId,
        id,
        stepId,
        stepSubType || "any",
        stepType || "action",
        "manual",
        inputContext || {}
      );
      setAuditData(res as any, { action: "create", entityType: "autonomous-workflow", entityId: stepId, afterState: result });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'autonomous_workflow', entityId: stepId } as any)), { tenantId: tenantId, operation: 'grcEvent:workflows.autonomous_workflow.created' });
      res.status(201).json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.post(
  "/workflows/:id/steps/:stepId/feedback",
  authenticate,
  requirePermission("workflow.autonomous.read"),
  validate({ body: feedbackSchema }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId!;
      const { id, stepId } = req.params;
      const { suggestionType, accepted, modified } = req.body;
      const result = await recordFeedback(tenantId, id, stepId, userId, suggestionType, accepted, modified);
      setAuditData(res as any, { action: "create", entityType: "autonomous-workflow", entityId: stepId, afterState: result });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'autonomous_workflow_feedback', entityId: stepId } as any)), { tenantId: tenantId, operation: 'grcEvent:workflows.autonomous_workflow_feedback.created' });
      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.get(
  "/workflows/ai-queue", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("workflow.autonomous.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      if (!tenantId) {
        res.status(400).json({
          error: "Tenant context missing",
          code: "TENANT_REQUIRED",
        });
        return;
      }
      const userId = req.query.userId as string | undefined;
      const result = await getAIQueue(tenantId, userId);
      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.post(
  "/workflows/ai-queue/:executionId/review",
  authenticate,
  requirePermission("workflow.autonomous.write"),
  validate({ body: createReviewBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const reviewedBy = req.userId!;
      const { executionId } = req.params;
      const { decision } = req.body;
      if (!["accepted", "rejected", "modified"].includes(decision)) {
        res.status(400).json({ error: "Invalid decision. Must be: accepted, rejected, or modified" });
        return;
      }
      const result = await reviewAIStep(tenantId, executionId, decision, reviewedBy);
      setAuditData(res as any, { action: "update", entityType: "autonomous-workflow", entityId: executionId, afterState: result });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'autonomous_workflow', entityId: executionId } as any)), { tenantId: tenantId, operation: 'grcEvent:workflows.autonomous_workflow.updated' });
      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.put(
  "/users/:userId/absence",
  authenticate,
  requirePermission("workflow.autonomous.write"),
  validate({ body: updateAbsenceBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { userId } = req.params;
      const { status, from, until } = req.body;
      if (!["available", "absent", "ooo"].includes(status)) {
        res.status(400).json({ error: "Invalid status. Must be: available, absent, or ooo" });
        return;
      }
      const result = await setUserAbsence(tenantId, userId, status, from, until);
      setAuditData(res as any, { action: "update", entityType: "autonomous-workflow", entityId: userId, afterState: result });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'user_absence', entityId: userId } as any)), { tenantId: tenantId, operation: 'grcEvent:workflows.user_absence.updated' });
      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.get(
  "/workflows/autonomous/config", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("workflow.autonomous.config"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const config = await getAutonomousConfig(tenantId);
      res.json(config);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

router.put(
  "/workflows/autonomous/config",
  authenticate,
  requirePermission("workflow.autonomous.config"),
  validate({ body: autonomousConfigSchema }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const config = await updateAutonomousConfig(tenantId, req.body);
      setAuditData(res as any, { action: "update", entityType: "autonomous-workflow", entityId: tenantId, afterState: config });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'autonomous_config', entityId: tenantId } as any)), { tenantId: tenantId, operation: 'grcEvent:workflows.autonomous_config.updated' });
      res.json(config);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

export default router;

