import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  assignRaci, getRaciForEntity, removeRaci, getRaciGaps,
  getOwnershipMatrix, assignEntityOwner, assignEntityTeam,
  getEvidenceActions, createEvidenceAction, updateEvidenceAction,
  getTeamDistribution, getEvidenceSectorMapping, getRaciDashboard,
} from '../../services/misc/grc-raci.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../ports/middleware.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';
import { raciGateBody, assignRaciBody, assignOwnerBody, assignTeamBody, createEvidenceActionBody, updateEvidenceActionBody } from "../../schemas/governance.schemas";
import { genericGovernanceSchema } from "../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("grc-raci"));

router.get("/dashboard", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const dashboard = await getRaciDashboard(req.tenantId);
  res.json(dashboard);
}));

router.post("/gate", authenticate, requirePermission("control.record.write"), validate({ body: raciGateBody }), asyncHandler(async (req, res) => {
  const { entityType, entityId, targetState } = req.body;
  if (!entityType || !entityId || !targetState) {
  res.status(400).json({ error: "entityType, entityId, and targetState required" }); return;
  }
  const { validateRaciGate } = await import("../../services/misc/enforcement-gate.service.js");
  const result = await validateRaciGate(
  req.tenantId, entityType, entityId, targetState,
  req.user!.userId!
  );
  if (!result.allowed) {
  res.status(409).json(result); return;
  }
  res.json(result);
}));

router.get("/matrix", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getOwnershipMatrix(req.tenantId, req.query.entity_type as string);
  res.json({ matrix: rows, count: rows.length });
}));

router.get("/gaps", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const gaps = await getRaciGaps(req.tenantId, req.query.entity_type as string);
  res.json({ gaps, count: gaps.length });
}));

router.get("/entity/:entityType/:entityId", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const raci = await getRaciForEntity(req.tenantId, req.params.entityType, req.params.entityId);
  res.json({ raci, count: raci.length });
}));

router.post("/assign", authenticate, requirePermission("control.record.write"), validate({ body: assignRaciBody }), asyncHandler(async (req, res) => {
  const { entityType, entityId, teamId, deptId, userId, raciRole, notes } = req.body;
  if (!entityType || !entityId || !raciRole) {
  res.status(400).json({ error: "entityType, entityId, and raciRole required" }); return;
  }
  const assignment = await assignRaci(req.tenantId, { entityType, entityId, teamId, deptId, userId, raciRole, notes });
  setAuditData(res as any, { action: "create", entityType: "grc_raci_assignment", entityId: assignment.assignment_id, afterState: assignment });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'raci_assigned', entityType, entityId, data: { raciRole, ...assignment } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(assignment);
}));

router.delete("/assign/:assignmentId", authenticate, requirePermission("control.record.write"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  await removeRaci(req.tenantId, req.params.assignmentId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'raci_removed', entityType: 'raci_assignment', entityId: req.params.assignmentId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.raci_assignment.raci_removed' });
  res.json({ message: "RACI assignment removed" });
}));

router.post("/owner", authenticate, requirePermission("control.record.write"), validate({ body: assignOwnerBody }), asyncHandler(async (req, res) => {
  const { entityType, entityId, userId, ownershipType, isPrimary } = req.body;
  if (!entityType || !entityId || !userId) {
  res.status(400).json({ error: "entityType, entityId, and userId required" }); return;
  }
  const owner = await assignEntityOwner(req.tenantId, {
  entityType, entityId, userId, ownershipType, isPrimary,
  assignedBy: req.user?.userId,
  });
  setAuditData(res as any, { action: "create", entityType: `${entityType}_owner`, entityId: owner.owner_id, afterState: owner });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'owner_assigned', entityType, entityId, data: owner } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.any.owner_assigned' });
  res.status(201).json(owner);
}));

router.post("/team", authenticate, requirePermission("control.record.write"), validate({ body: assignTeamBody }), asyncHandler(async (req, res) => {
  const { entityType, entityId, teamId, isSecondary, deptId } = req.body;
  if (!entityType || !entityId || !teamId) {
  res.status(400).json({ error: "entityType, entityId, and teamId required" }); return;
  }
  const updated = await assignEntityTeam(req.tenantId, { entityType, entityId, teamId, isSecondary, deptId });
  if (!updated) { res.status(404).json({ error: "Entity not found" }); return; }
  setAuditData(res as any, { action: "update", entityType, entityId, afterState: updated });
  res.json(updated);
}));

router.get("/team-distribution/:entityType", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const dist = await getTeamDistribution(req.tenantId, (req as any).params.entityType as string);
  res.json({ distribution: dist, count: dist.length });
}));

router.get("/evidence-sectors", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const mapping = await getEvidenceSectorMapping(req.tenantId, req.query.sector_code as string);
  res.json({ mapping, count: mapping.length });
}));

router.get("/evidence/:evidenceId/actions", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const actions = await getEvidenceActions(req.tenantId, req.params.evidenceId);
  res.json({ actions, count: actions.length });
}));

router.post("/evidence/:evidenceId/actions", authenticate, requirePermission("control.record.write"), validate({ body: createEvidenceActionBody }), asyncHandler(async (req, res) => {
  const { actionType, title, description, assignedTo, assignedTeam, dueDate, priority } = req.body;
  if (!actionType || !title) { res.status(400).json({ error: "actionType and title required" }); return; }
  const action = await createEvidenceAction(req.tenantId, {
  evidenceId: req.params.evidenceId, actionType, title, description, assignedTo, assignedTeam, dueDate, priority,
  });
  setAuditData(res as any, { action: "create", entityType: "evidence_action", entityId: action.action_id, afterState: action });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'evidence', event: 'action_created', entityType: 'evidence_action', entityId: action.action_id, data: action } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:evidence.evidence_action.action_created' });
  res.status(201).json(action);
}));

router.put("/evidence-actions/:actionId", authenticate, requirePermission("control.record.write"), validate({ body: updateEvidenceActionBody }), asyncHandler(async (req, res) => {
  const { status, outcomeNotes } = req.body;
  const action = await updateEvidenceAction(req.tenantId, req.params.actionId, {
  status, completedBy: req.user?.userId, outcomeNotes,
  });
  if (!action) { res.status(404).json({ error: "Action not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "evidence_action", entityId: req.params.actionId, afterState: action });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'evidence', event: 'action_updated', entityType: 'evidence_action', entityId: req.params.actionId, data: action } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:evidence.evidence_action.action_updated' });
  res.json(action);
}));

export default router;

