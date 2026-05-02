import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  getChainDefinitions, getChainDefinition, upsertChainDefinition,
  startChain, advanceChain, cancelChain, failChainStep,
  getChainInstance, getChainInstances, getChainStepLog,
} from '../../services/chains/workflow-chain-executor.service';
import { errMsg } from '../../../../i18n/error-messages';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { z as _z } from 'zod';


// ── Zod Validation Schemas ──
import { auditMiddleware, asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { createDefinitionsBody, createInstancesBody, createInstancesinstanceIdAdvanceBody, createInstancesinstanceIdCancelBody, createInstancesinstanceIdFailBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));
router.use(auditMiddleware('workflow-chains'));

router.get('/definitions', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const defs = await getChainDefinitions(req.tenantId!);
  res.json({ chains: defs, count: defs.length });
}));

router.get('/definitions/:chainCode', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const def = await getChainDefinition(req.tenantId!, req.params.chainCode);
  if (!def) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(def);
}));

router.post('/definitions', authenticate, requirePermission('workflow.instance.write'), validate({ body: createDefinitionsBody }), asyncHandler(async (req, res) => {
  const { chain_code, name_en, name_ar, steps, sod_rules } = req.body;
  if (!chain_code || !name_en || !steps?.length) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const def = await upsertChainDefinition(req.tenantId!, { chain_code, name_en, name_ar, steps, sod_rules });
  res.status(201).json(def);
}));

router.post('/instances', authenticate, requirePermission('workflow.instance.execute'), validate({ body: createInstancesBody }), asyncHandler(async (req, res) => {
  const { chainCode, triggerEntityType, triggerEntityId, context } = req.body;
  if (!chainCode) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await startChain(req.tenantId!, chainCode, {
  triggerEntityType, triggerEntityId, context, createdBy: req.user!.userId!,
  });
  res.status(201).json(result);
}));

router.get('/instances', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { chainCode, status, moduleCode } = req.query as Record<string, string>;
  const instances = await getChainInstances(req.tenantId!, { chainCode, status, moduleCode });
  res.json({ instances, count: instances.length });
}));

router.get('/instances/:instanceId', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const instance = await getChainInstance(req.tenantId!, req.params.instanceId);
  if (!instance) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const steps = await getChainStepLog(req.tenantId!, req.params.instanceId);
  res.json({ instance, steps });
}));

router.post('/instances/:instanceId/advance', authenticate, requirePermission('workflow.instance.execute'), validate({ body: createInstancesinstanceIdAdvanceBody }), asyncHandler(async (req, res) => {
  const { outcome, notes, outcomeData } = req.body;
  const result = await advanceChain(req.tenantId!, req.params.instanceId, {
  outcome, actorUserId: req.user!.userId!, notes, outcomeData,
  });
  res.json(result);
}));

router.post('/instances/:instanceId/cancel', authenticate, requirePermission('workflow.instance.write'), validate({ body: createInstancesinstanceIdCancelBody }), asyncHandler(async (req, res) => {
  await cancelChain(req.tenantId!, req.params.instanceId, req.body.reason);
  res.json({ success: true });
}));

router.post('/instances/:instanceId/fail', authenticate, requirePermission('workflow.instance.write'), validate({ body: createInstancesinstanceIdFailBody }), asyncHandler(async (req, res) => {
  const { stepNo, reason } = req.body;
  await failChainStep(req.tenantId!, req.params.instanceId, stepNo, reason);
  res.json({ success: true });
}));

export default router;

