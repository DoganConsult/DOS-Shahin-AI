import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, type Request, type Response } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { z } from "zod";
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack, mutationEventHook, blockInHumanOnlyMode } from '../../ports/middleware.port';

const genericPayloadSchema = z.record(z.unknown());

import * as integration from '../../services/chains/module-workflow-integration.service';
import { getCompensatingAction as _getCompensatingAction } from '../../services/ops/workflow-rollback.service';
import { gateCheckBody, aiNoteBody, draftBody } from "../../schemas/workflow.schemas";

const router = Router();
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));
router.use(auditMiddleware('workflows'));
router.use(automationMiddleware('workflows'));

router.get(
  '/workflows/enterprise/modules/:moduleCode/health', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const health = await integration.getModuleWorkflowHealth(req.tenantId!, req.params.moduleCode);
      res.json(health);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

router.get(
  '/workflows/enterprise/modules/:moduleCode/ai-policy', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const policy = await integration.resolveModuleAIPolicy(req.tenantId!, req.params.moduleCode);
      res.json(policy);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

router.get(
  '/workflows/enterprise/modules/:moduleCode/sla-config', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const cfg = integration.getModuleSLAConfig(req.params.moduleCode);
      res.json({ moduleCode: req.params.moduleCode, ...cfg });
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

router.get(
  '/workflows/enterprise/modules/:moduleCode/recommendations', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const recs = await integration.getModuleRecommendations(
        req.tenantId!, req.params.moduleCode, req.query.stepType as string | undefined,
      );
      res.json({ moduleCode: req.params.moduleCode, stepType: req.query.stepType ?? null, recommendations: recs });
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

router.get(
  '/workflows/enterprise/modules/:moduleCode/agent', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const mc = req.params.moduleCode;
      const agentId = integration.getAgentForModule(mc);
      const agentModules = agentId ? integration.getModulesForAgent(agentId) : [];
      res.json({ moduleCode: mc, agentId, agentModules });
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);
router.post(
  '/workflows/enterprise/gate-check',
  authenticate, requirePermission('workflow.autonomous.read'), blockInHumanOnlyMode(),
  validate({ body: gateCheckBody }),
  async (req: Request, res: Response) => {
    try {
      const result = await integration.runAIGateChecks(
        { tenantId: req.tenantId!, moduleCode: req.body.moduleCode, userId: req.userId!, ...req.body },
        req.body.stepType,
      );
      res.json(result);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);
router.post(
  '/workflows/enterprise/ai-note',
  authenticate, requirePermission('workflow.autonomous.write'), blockInHumanOnlyMode(),
  validate({ body: aiNoteBody }),
  async (req: Request, res: Response) => {
    try {
      const result = await integration.createModuleAINote(
        req.tenantId!, req.body.moduleCode,
        { ...req.body, instanceId: req.body.instanceId ?? '00000000-0000-0000-0000-000000000000' },
      );
      setAuditData(res as any, { action: 'create', entityType: 'module_ai_note', entityId: result.noteId });
      res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);
router.post(
  '/workflows/enterprise/draft-action',
  authenticate, requirePermission('workflow.autonomous.write'), blockInHumanOnlyMode(),
  validate({ body: draftBody }),
  async (req: Request, res: Response) => {
    try {
      const result = await integration.createModuleDraftAction(
        req.tenantId!, req.body.moduleCode,
        { ...req.body, instanceId: req.body.instanceId ?? '00000000-0000-0000-0000-000000000000' },
      );
      setAuditData(res as any, { action: 'create', entityType: 'module_draft_action', entityId: result.draftId });
      res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

router.get(
  '/workflows/enterprise/chains', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  (_req: Request, res: Response) => {
    res.json({ chains: integration.CROSS_MODULE_CHAIN_TEMPLATES });
  },
);

router.get(
  '/workflows/enterprise/chains/:chainCode', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  (req: Request, res: Response) => {
    const chain = integration.getCrossModuleChainTemplate(req.params.chainCode);
    if (!chain) return res.status(404).json({ error: 'Chain template not found' });
    res.json(chain);
  },
);

router.get(
  '/workflows/enterprise/modules/:moduleCode/chains', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  (req: Request, res: Response) => {
    const chains = integration.getChainTemplatesForModule(req.params.moduleCode);
    res.json({ moduleCode: req.params.moduleCode, chains });
  },
);

router.get(
  '/workflows/enterprise/compensations', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  (_req: Request, res: Response) => {
    res.json({ compensations: integration.MODULE_COMPENSATION_REGISTRY });
  },
);

router.get(
  '/workflows/enterprise/agent-bindings', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  (_req: Request, res: Response) => {
    res.json({ bindings: integration.AGENT_MODULE_BINDING });
  },
);

router.get(
  '/workflows/enterprise/overview', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const operationalModules = ['risk','compliance','policy','evidence','audit','incident',
        'exception','governance','vendor','bcp','asset','remediation','action',
        'training','qiyas','ai-governance'];
      const modules = await Promise.all(
        operationalModules.map(mc => integration.getModuleWorkflowHealth(req.tenantId!, mc)),
      );
      const summary = {
        totalModules: modules.length,
        healthy: modules.filter(m => m.health === 'healthy').length,
        degraded: modules.filter(m => m.health === 'degraded').length,
        halted: modules.filter(m => m.health === 'halted').length,
      };
      res.json({ modules, summary });
    } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
  },
);

export default router;

