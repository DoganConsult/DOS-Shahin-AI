import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  createBIA, getBIAs, getBIAById, calculateBIACriticality,
  createBCPExercise, getBCPExercises, recordExerciseResult, getExerciseGaps,
  createCrisisCommPlan, getCrisisCommPlans, getNotificationTree, activateCrisisComm,
  createRecoveryStrategy, getRecoveryStrategies, linkStrategyToBIA,
  activateBCPlan, getBCPActivations, updateRecoveryStep, deactivateBCPlan,
  createDependencyMap, getDependencyChain,
  runBCMMaturityAssessment, getBCMMaturityHistory,
  detectSinglePointsOfFailure, analyzeIncidentForBCPLearning, assessBusinessChangeImpact,
} from '../services/bcm-advanced.service';


// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createBiaBody, createBiabiaIdCalculateBody, createExercisesBody, createExercisesexerciseIdResultsBody, createCrisiscommBody, createCrisiscommplanIdActivateBody, createRecoverystrategiesBody, createRecoverystrategiesstrategyIdLinkbiaBody, createActivateBody, updateRecoverystepsstepIdBody, createDeactivateactivationIdBody, createDependencymapsBody, createMaturityBody, createBusinesschangeimpactBody } from "../schemas/bcp.schemas";

const router = Router();
router.use(moduleStack('bcp'));
router.use(auditMiddleware("bcp"));

const emit = (req: Request, event: string, entityType: string, entityId: string, data?: any) =>
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event, entityType, entityId, data } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:bcp.any.any' });

router.post("/bia", authenticate, requirePermission("bcp.plan.write"), validate({ body: createBiaBody }), asyncHandler(async (req, res) => {
  const bia = await createBIA(req.tenantId!, { ...req.body, assessor_id: req.body.assessor_id || req.user?.userId });
  if (!bia) { res.status(500).json({ error: "Failed to create BIA" }); return; }
  setAuditData(res as any, { action: "create", entityType: "bia_assessment", entityId: bia.bia_id, afterState: bia });
  emit(req, "bia_created", "bia_assessment", bia.bia_id, req.body);
  res.status(201).json(bia);
}));

router.get("/bia", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getBIAs(req.tenantId!, req.query.status as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.get("/bia/:biaId", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const bia = await getBIAById(req.tenantId!, req.params.biaId);
  if (!bia) { res.status(404).json({ error: "BIA not found" }); return; }
  res.json(bia);
}));

router.post("/bia/:biaId/calculate", authenticate, requirePermission("bcp.plan.write"), validate({ body: createBiabiaIdCalculateBody }), asyncHandler(async (req, res) => {
  const result = await calculateBIACriticality(req.tenantId!, req.params.biaId);
  setAuditData(res as any, { action: "update", entityType: "bia_assessment", entityId: req.params.biaId, afterState: result });
  emit(req, "bia_criticality_calculated", "bia_assessment", req.params.biaId, result);
  res.json(result);
}));

router.post("/exercises", authenticate, requirePermission("bcp.plan.write"), validate({ body: createExercisesBody }), asyncHandler(async (req, res) => {
  const ex = await createBCPExercise(req.tenantId!, req.body);
  if (!ex) { res.status(500).json({ error: "Failed to create exercise" }); return; }
  setAuditData(res as any, { action: "create", entityType: "bcp_exercise", entityId: ex.exercise_id, afterState: ex });
  emit(req, "exercise_created", "bcp_exercise", ex.exercise_id, req.body);
  res.status(201).json(ex);
}));

router.get("/exercises", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getBCPExercises(req.tenantId!, req.query.status as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/exercises/:exerciseId/results", authenticate, requirePermission("bcp.plan.write"), validate({ body: createExercisesexerciseIdResultsBody }), asyncHandler(async (req, res) => {
  const result = await recordExerciseResult(req.tenantId!, req.params.exerciseId, req.body);
  if (!result) { res.status(500).json({ error: "Failed to record exercise result" }); return; }
  setAuditData(res as any, { action: "create", entityType: "bcp_exercise_result", entityId: result.result_id, afterState: result });
  emit(req, "exercise_result_recorded", "bcp_exercise", req.params.exerciseId, req.body);
  res.status(201).json(result);
}));

router.get("/exercises/:exerciseId/gaps", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getExerciseGaps(req.tenantId!, req.params.exerciseId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/crisis-comm", authenticate, requirePermission("bcp.plan.write"), validate({ body: createCrisiscommBody }), asyncHandler(async (req, res) => {
  const plan = await createCrisisCommPlan(req.tenantId!, req.body);
  if (!plan) { res.status(500).json({ error: "Failed to create crisis comm plan" }); return; }
  setAuditData(res as any, { action: "create", entityType: "crisis_comm_plan", entityId: plan.plan_id, afterState: plan });
  emit(req, "crisis_comm_plan_created", "crisis_comm_plan", plan.plan_id, req.body);
  res.status(201).json(plan);
}));

router.get("/crisis-comm", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getCrisisCommPlans(req.tenantId!)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.get("/crisis-comm/:planId/tree", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getNotificationTree(req.tenantId!, req.params.planId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/crisis-comm/:planId/activate", authenticate, requirePermission("bcp.plan.write"), validate({ body: createCrisiscommplanIdActivateBody }), asyncHandler(async (req, res) => {
  const activation = await activateCrisisComm(req.tenantId!, req.params.planId, req.user!.userId!, req.body.incident_id);
  if (!activation) { res.status(500).json({ error: "Failed to activate crisis comm" }); return; }
  setAuditData(res as any, { action: "update", entityType: "crisis_comm_plan", entityId: req.params.planId, afterState: activation });
  emit(req, "crisis_comm_activated", "crisis_comm_plan", activation.activation_id, req.body);
  res.json(activation);
}));

router.post("/recovery-strategies", authenticate, requirePermission("bcp.plan.write"), validate({ body: createRecoverystrategiesBody }), asyncHandler(async (req, res) => {
  const s = await createRecoveryStrategy(req.tenantId!, req.body);
  if (!s) { res.status(500).json({ error: "Failed to create recovery strategy" }); return; }
  setAuditData(res as any, { action: "create", entityType: "bcm_recovery_strategy", entityId: s.strategy_id, afterState: s });
  emit(req, "recovery_strategy_created", "bcm_recovery_strategy", s.strategy_id, req.body);
  res.status(201).json(s);
}));

router.get("/recovery-strategies", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getRecoveryStrategies(req.tenantId!, req.query.bia_id as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/recovery-strategies/:strategyId/link-bia", authenticate, requirePermission("bcp.plan.write"), validate({ body: createRecoverystrategiesstrategyIdLinkbiaBody }), asyncHandler(async (req, res) => {
  const r = await linkStrategyToBIA(req.tenantId!, req.params.strategyId, req.body.bia_id);
  setAuditData(res as any, { action: "update", entityType: "bcm_recovery_strategy", entityId: req.params.strategyId, afterState: r });
  res.json(r);
}));

router.post("/activate", authenticate, requirePermission("bcp.plan.write"), validate({ body: createActivateBody }), asyncHandler(async (req, res) => {
  const a = await activateBCPlan(req.tenantId!, req.body.plan_id, req.user!.userId!, req.body.reason, req.body.incident_id);
  if (!a) { res.status(500).json({ error: "Failed to activate plan" }); return; }
  setAuditData(res as any, { action: "create", entityType: "bcp_activation", entityId: a.activation_id, afterState: a });
  emit(req, "plan_activated", "bcp_activation", a.activation_id, req.body);
  res.json(a);
}));

router.get("/activations", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getBCPActivations(req.tenantId!, req.query.status as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.put("/recovery-steps/:stepId", authenticate, requirePermission("bcp.plan.write"), validate({ body: updateRecoverystepsstepIdBody }), asyncHandler(async (req, res) => {
  const step = await updateRecoveryStep(req.tenantId!, req.params.stepId, req.body);
  setAuditData(res as any, { action: "update", entityType: "bcp_recovery_step", entityId: req.params.stepId, afterState: step });
  emit(req, "recovery_step_updated", "bcp_recovery_step", req.params.stepId, req.body);
  res.json(step);
}));

router.post("/deactivate/:activationId", authenticate, requirePermission("bcp.plan.write"), validate({ body: createDeactivateactivationIdBody }), asyncHandler(async (req, res) => {
  const r = await deactivateBCPlan(req.tenantId!, req.params.activationId, req.user!.userId!);
  setAuditData(res as any, { action: "update", entityType: "bcp_activation", entityId: req.params.activationId, afterState: r });
  emit(req, "plan_deactivated", "bcp_activation", req.params.activationId);
  res.json(r);
}));

router.post("/dependency-maps", authenticate, requirePermission("bcp.plan.write"), validate({ body: createDependencymapsBody }), asyncHandler(async (req, res) => {
  const m = await createDependencyMap(req.tenantId!, req.body);
  if (!m) { res.status(500).json({ error: "Failed to create dependency map" }); return; }
  setAuditData(res as any, { action: "create", entityType: "bcm_dependency_map", entityId: m.map_id, afterState: m });
  res.status(201).json(m);
}));

router.get("/dependency-maps/:mapId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getDependencyChain(req.tenantId!, req.params.mapId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/maturity", authenticate, requirePermission("bcp.plan.write"), validate({ body: createMaturityBody }), asyncHandler(async (req, res) => {
  const m = await runBCMMaturityAssessment(req.tenantId!, req.body);
  if (!m) { res.status(500).json({ error: "Failed to run maturity assessment" }); return; }
  setAuditData(res as any, { action: "create", entityType: "bcm_maturity_assessment", entityId: m.assessment_id, afterState: m });
  emit(req, "maturity_assessed", "bcm_maturity_assessment", m.assessment_id, { score: m.overall_score });
  res.status(201).json(m);
}));

router.get("/maturity/history", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await getBCMMaturityHistory(req.tenantId!)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

// ── Leading Capabilities ────────────────────────────────────────────────────

router.get("/spof", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await detectSinglePointsOfFailure(req.tenantId!)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.get("/incident-learning/:incidentId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("bcp.plan.read"), async (req: Request, res: Response) => {
  try { res.json(await analyzeIncidentForBCPLearning(req.tenantId!, req.params.incidentId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/business-change-impact", authenticate, requirePermission("bcp.plan.write"), validate({ body: createBusinesschangeimpactBody }), asyncHandler(async (req, res) => {
  const { changeType, entityType, entityId, entityName, details } = req.body;
  if (!changeType || !entityName) { res.status(400).json({ error: 'changeType and entityName required' }); return; }
  const impact = await assessBusinessChangeImpact(req.tenantId!, changeType, { entityType, entityId, entityName, details });
  setAuditData(res as any, { action: "create", entityType: "bcp_change_impact", entityId: entityId || 'system', afterState: impact });
  res.json(impact);
}));

export default router;
