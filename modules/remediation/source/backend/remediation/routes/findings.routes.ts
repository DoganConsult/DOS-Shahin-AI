import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../ports/platform.port';
import { getFirstRow } from '@dos/db';
import { getClearanceFilterHierarchy } from '../services/clearance.service';
// ── Zod Validation Schemas ──
import { asyncHandler, requireOwnership, auditMiddleware, setAuditData, automationMiddleware, enforceMandatoryFields, enforceStageGates, lifecycleGate as _lifecycleGate, validate, moduleStack } from '../ports/middleware.port';
import { createRootBody, updateIdBody } from "../schemas/remediation.schemas";

const router = Router();
router.use(moduleStack('remediation'));
router.use(auditMiddleware("findings"));
router.use(automationMiddleware("findings"));
router.use(enforceMandatoryFields("finding"));
router.use(enforceStageGates("finding"));

router.get("/", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const wsId = req.query.workspace_id as string | undefined;
  
  // P5.5: Filter by user clearance
  let clearanceCondition = '';
  let clearanceParam: number | undefined;
  if (req.user?.role) {
  const clearanceFilter = getClearanceFilterHierarchy(req.user.role, 'confidentiality_level', wsId ? 2 : 1);
  clearanceCondition = ` AND ${clearanceFilter.condition}`;
  clearanceParam = clearanceFilter.paramValue;
  }
  
  const result = wsId
  ? await safeQuery(
  `SELECT * FROM "${schema}".findings WHERE deleted_at IS NULL AND workspace_id = $1${clearanceCondition} ORDER BY created_at DESC`,
  clearanceParam !== undefined ? [wsId, clearanceParam] : [wsId]
  )
  : await safeQuery(
  `SELECT * FROM "${schema}".findings WHERE deleted_at IS NULL${clearanceCondition} ORDER BY created_at DESC`,
  clearanceParam !== undefined ? [clearanceParam] : []
  );
  res.json({ findings: result.rows, count: result.rows.length });
}));

router.get("/:id", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".findings WHERE finding_id = $1`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Finding not found" }); return; }
  
  // P5.5: Check user clearance before returning
  if (req.user?.role) {
  const { canAccessConfidentiality } = await import("../services/clearance.service.js");
  const finding = getFirstRow(result)!;
  const confidentialityLevel = finding.confidentiality_level || 'internal';
  if (!(await canAccessConfidentiality(req.user.role, confidentialityLevel))) {
  res.status(403).json({ error: "Access denied: insufficient clearance level" });
  return;
  }
  }
  
  res.json(getFirstRow(result));
}));

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createRootBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { title, description, severity, source } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".findings (title, description, severity, source, status, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
  [title, description || '', severity || 'medium', source || 'audit', 'open', req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "finding", entityId: getFirstRow(result)?.finding_id, afterState: getFirstRow(result) });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'findings', event: 'created', entityType: 'finding', entityId: getFirstRow(result)?.finding_id, data: getFirstRow(result) } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(getFirstRow(result));
}));

router.put("/:id", authenticate, requirePermission("audit.record.manage"), validate({ body: updateIdBody }), requireOwnership("finding"), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const cols = Object.keys(req.body).filter(k => ['title','description','severity','source','status','resolution'].includes(k));
  if (!cols.length) { res.status(400).json({ error: "No valid fields to update" }); return; }
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => req.body[c]);
  const result = await safeQuery(
  `UPDATE "${schema}".findings SET ${sets.join(', ')}, updated_at = NOW() WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`,
  [req.params.id, ...vals]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Finding not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "finding", entityId: req.params.id as string, afterState: getFirstRow(result) });
  const findEvt = req.body.status === 'closed' ? 'closed' : 'updated';
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'findings', event: findEvt, entityType: 'finding', entityId: req.params.id as string, data: getFirstRow(result) } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(getFirstRow(result));
}));

router.delete("/:id", authenticate, requirePermission("audit.record.manage"), requireOwnership("finding"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const enforcement = await enforceStatusTransition(req.tenantId!, {
  moduleCode: 'audit', table: 'findings', idColumn: 'finding_id',
  entityId: req.params.id, toStatus: 'closed', actorUserId: req.user!.userId!,
  extraSets: 'deleted_at = NOW()',
  });
  if (!enforcement.success && enforcement.blocked) {
  res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return;
  }
  if (!enforcement.success) {
  await safeQuery(`UPDATE "${schema}".findings SET deleted_at = NOW(), status = 'closed', updated_at = NOW() WHERE finding_id = $1 AND deleted_at IS NULL`, [req.params.id]);
  }
  const result = await safeQuery(`SELECT finding_id FROM "${schema}".findings WHERE finding_id = $1`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Finding not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "finding", entityId: req.params.id as string });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'findings', event: 'deleted', entityType: 'finding', entityId: req.params.id as string } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ message: "Finding deleted", finding_id: req.params.id });
}));

export default router;

