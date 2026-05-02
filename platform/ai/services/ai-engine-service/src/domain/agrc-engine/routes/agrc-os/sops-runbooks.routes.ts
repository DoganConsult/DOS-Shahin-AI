// @ts-nocheck
import { Request, Response, Router } from 'express';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, validate, validateSOP, validateRunbook } from '../../ports/middleware.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { writeLimiter } from './shared';

import { createSopsBody, createSeedBody, createStartBody, updateCompletionsBody, createRunbooksBody, createSetupBody } from '../../schemas/agrc-engine.schemas';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('agrc-engine'));

// ── SOP / Procedure Library ────────────────────────────────────────────────
router.get('/sops', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('sop.document.read'), async (req: Request, res: Response) => {

  const { getSOPs } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  const result = await getSOPs(req.tenantId, {
    processType: req.query.processType as string,
    stageId: req.query.stageId as string,
    roleId: req.query.roleId as string,
  });
  res.json(result);
});

router.post('/sops', authenticate, requirePermission('sop.document.write'), validateSOP, validate({ body: createSopsBody }), async (req: Request, res: Response) => {

  const { upsertSOP } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  const result = await upsertSOP(req.tenantId, req.body);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.delete('/sops/:sopId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('sop.document.write'), async (req: Request, res: Response) => {

  const { deleteSOP } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  await deleteSOP(req.tenantId, req.params.sopId);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'deleted', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json({ success: true });
});

router.post('/sops/seed', authenticate, requirePermission('platform.agent.manage'), validate({ body: createSeedBody }), async (req: Request, res: Response) => {

  const { seedDefaultSOPs } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  const count = await seedDefaultSOPs(req.tenantId);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json({ seeded: count });
});

router.post('/sops/:sopId/start', authenticate, requirePermission('sop.document.read'), validate({ body: createStartBody }), async (req: Request, res: Response) => {

  const { startSOPCompletion } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  const { totalSteps } = req.body;
  if (!totalSteps || totalSteps < 1) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }
  const result = await startSOPCompletion(req.tenantId, req.params.sopId, req.userId, totalSteps);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.put('/sops/completions/:completionId', authenticate, requirePermission('sop.document.read'), validate({ body: updateCompletionsBody }), async (req: Request, res: Response) => {

  const { updateSOPProgress } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  const { completedSteps, notes } = req.body;
  if (!Array.isArray(completedSteps)) {
    res.status(400).json({ error: errMsg('INVALID_INPUT', req) });
    return;
  }
  const result = await updateSOPProgress(req.tenantId, req.params.completionId, completedSteps, notes);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.get('/sops/completions', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('sop.document.read'), async (req: Request, res: Response) => {

  const { getSOPCompletions } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  const result = await getSOPCompletions(req.tenantId, {
    sopId: req.query.sopId as string,
    userId: req.query.userId as string,
    status: req.query.status as string,
    limit: parseInt(req.query.limit as string) || 100,
  });
  res.json(result);
});

router.get('/sops/compliance-stats', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('sop.document.read'), async (req: Request, res: Response) => {

  const { getSOPComplianceStats } = await import('@dos/platform-core/services/document-generation/sop-library.service');
  const result = await getSOPComplianceStats(req.tenantId);
  res.json(result);
});

// ── Runbooks ───────────────────────────────────────────────────────────────
router.get('/runbooks', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('runbook.record.read'), async (req: Request, res: Response) => {

  const { getRunbooks } = await import('../../services/agrc-runbook.service');
  const result = await getRunbooks(req.tenantId, req.query.triggerEvent as string);
  res.json(result);
});

router.post('/runbooks', authenticate, requirePermission('runbook.record.write'), validateRunbook, validate({ body: createRunbooksBody }), async (req: Request, res: Response) => {

  const { upsertRunbook } = await import('../../services/agrc-runbook.service');
  const result = await upsertRunbook(req.tenantId, req.body);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
});

router.delete('/runbooks/:runbookId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('runbook.record.write'), async (req: Request, res: Response) => {

  const { deleteRunbook } = await import('../../services/agrc-runbook.service');
  await deleteRunbook(req.tenantId, req.params.runbookId);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'deleted', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json({ success: true });
});

router.post('/runbooks/seed', authenticate, requirePermission('platform.agent.manage'), validate({ body: createSeedBody }), async (req: Request, res: Response) => {

  const { seedDefaultRunbooks } = await import('../../services/agrc-runbook.service');
  const count = await seedDefaultRunbooks(req.tenantId);
  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json({ seeded: count });
});

router.post('/setup', authenticate, requirePermission('platform.agent.manage'), writeLimiter, validate({ body: createSetupBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { getRiskAppetite, upsertRiskAppetite } = await import('../../../modules/governance/services/governance/governance-constitution.service');

  const { seedDefaultRunbooks } = await import('../../services/agrc-runbook.service');

  const { seedDefaultSOPs } = await import('@dos/platform-core/services/document-generation/sop-library.service');

  let riskAppetiteSeeded = 0;
  const appetite = await getRiskAppetite(tenantId);
  if (appetite.length === 0) {
    await upsertRiskAppetite(tenantId, [
      { category: 'Operational', maxResidualScore: 25, acceptanceRequiresRole: 'compliance_officer', reviewCadenceDays: 90 },
      { category: 'Financial', maxResidualScore: 15, acceptanceRequiresRole: 'owner', reviewCadenceDays: 60 },
      { category: 'Compliance', maxResidualScore: 10, acceptanceRequiresRole: 'owner', reviewCadenceDays: 30 },
    ]);
    riskAppetiteSeeded = 3;
  }

  const runbooksSeeded = await seedDefaultRunbooks(tenantId);
  const sopsSeeded = await seedDefaultSOPs(tenantId);

  let moduleDemoData = { incidents: 0, nearMisses: 0, bcpPlans: 0, vendors: 0, campaigns: 0, assignments: 0 };
  try {

    const { seedModuleDemoData } = await import('../../../../platform/dos/provisioning/workspace-seed.service');
    moduleDemoData = await seedModuleDemoData(tenantId);
  } catch {
    /* best effort */
  }

  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json({
    ok: true,
    riskAppetiteSeeded,
    runbooksSeeded,
    sopsSeeded,
    moduleDemoData,
  });
});

router.get('/runbooks/executions', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('runbook.record.read'), async (req: Request, res: Response) => {

  const { getRunbookExecutionHistory } = await import('../../services/agrc-runbook.service');
  const result = await getRunbookExecutionHistory(req.tenantId, {
    runbookId: req.query.runbookId as string,
    status: req.query.status as string,
    limit: parseInt(req.query.limit as string) || 100,
  });
  res.json(result);
});

export default router;
