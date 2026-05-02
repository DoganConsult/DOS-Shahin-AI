import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, type Request, type Response } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { z } from "zod";
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, automationMiddleware, validate, moduleStack, mutationEventHook, blockInHumanOnlyMode } from '../../ports/middleware.port';

const genericPayloadSchema = z.record(z.unknown());

import * as orchestrator from '../../services/ai/module-ai-orchestrator.service';
import { preflightBody, suggestBody, noteBody, draftBody } from "../../schemas/workflow.schemas";

const router = Router();
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));
router.use(auditMiddleware('workflows'));
router.use(automationMiddleware('workflows'));

router.get(
  '/modules/:moduleCode/ai-status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const status = await orchestrator.getModuleAIStatus(req.tenantId!, req.params.moduleCode);
      res.json(status);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

router.get(
  '/modules/:moduleCode/ai-capabilities', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  (req: Request, res: Response) => {
    const caps = orchestrator.getModuleAICapabilities(req.params.moduleCode);
    res.json(caps);
  },
);

router.get(
  '/ai-capabilities', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  (_req: Request, res: Response) => {
    const all = orchestrator.getAllModuleAICapabilities();
    const summary = {
      total: all.length,
      aiEnabled: all.filter(c => c.aiEnabled).length,
      fullAutonomy: all.filter(c => c.automationLevel === 'full').length,
      semiAutonomy: all.filter(c => c.automationLevel === 'semi').length,
      manual: all.filter(c => c.automationLevel === 'manual').length,
    };
    res.json({ modules: all, summary });
  },
);
router.post(
  '/preflight',
  authenticate, requirePermission('workflow.autonomous.read'), blockInHumanOnlyMode(),
  validate({ body: preflightBody }),
  async (req: Request, res: Response) => {
    try {
      const ctx: orchestrator.ModuleAIContext = {
        tenantId: req.tenantId!,
        userId: req.userId!,
        moduleCode: req.body.moduleCode,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        instanceId: req.body.instanceId,
        workflowId: req.body.workflowId,
      };
      const result = await orchestrator.preflightAIOperation(ctx, req.body.stepType);
      res.json(result);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);
router.post(
  '/suggest',
  authenticate, requirePermission('workflow.autonomous.write'), blockInHumanOnlyMode(),
  validate({ body: suggestBody }),
  async (req: Request, res: Response) => {
    try {
      const ctx: orchestrator.ModuleAIContext = {
        tenantId: req.tenantId!,
        userId: req.userId!,
        moduleCode: req.body.moduleCode,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        instanceId: req.body.instanceId,
      };
      const result = await orchestrator.suggestAIAction(ctx, req.body.stepType, req.body.actionDescription, req.body.confidence);
      if (!result) return res.status(403).json({ error: 'AI operation not permitted for this module/context' });
      res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);
router.post(
  '/note',
  authenticate, requirePermission('workflow.autonomous.write'), blockInHumanOnlyMode(),
  validate({ body: noteBody }),
  async (req: Request, res: Response) => {
    try {
      const ctx: orchestrator.ModuleAIContext = {
        tenantId: req.tenantId!,
        userId: req.userId!,
        moduleCode: req.body.moduleCode,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        instanceId: req.body.instanceId,
      };
      const result = await orchestrator.createModuleNote(ctx, req.body.stepType, {
        noteType: req.body.noteType,
        content: req.body.content,
        confidence: req.body.confidence,
        trustLevel: req.body.trustLevel,
      });
      if (!result) return res.status(403).json({ error: 'AI operation not permitted' });
      res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);
router.post(
  '/draft',
  authenticate, requirePermission('workflow.autonomous.write'), blockInHumanOnlyMode(),
  validate({ body: draftBody }),
  async (req: Request, res: Response) => {
    try {
      const ctx: orchestrator.ModuleAIContext = {
        tenantId: req.tenantId!,
        userId: req.userId!,
        moduleCode: req.body.moduleCode,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        instanceId: req.body.instanceId,
      };
      const result = await orchestrator.createModuleDraft(ctx, req.body.stepType, {
        draftType: req.body.draftType,
        title: req.body.title,
        draftContent: req.body.draftContent,
        confidence: req.body.confidence,
      });
      if (!result) return res.status(403).json({ error: 'AI operation not permitted' });
      res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

export default router;

