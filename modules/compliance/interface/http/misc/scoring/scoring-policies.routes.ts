import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../../../../ports/database.port';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { createScoringPolicyBody, updateScoringPolicyBody, genericComplianceSchema } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

router.get("/", authenticate, requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".scoring_policies ORDER BY created_at DESC`);
  res.json({ policies: result.rows, count: result.rows.length });
}));

router.post("/", authenticate, requirePermission("compliance.program.write"), validate({ body: createScoringPolicyBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { name, description, weights } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".scoring_policies (name, description, weights, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
  [name, description || '', JSON.stringify(weights || {}), req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "scoring-policy", entityId: getFirstRow(result)?.policy_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'scoring_policies', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:assessments.scoring_policies.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put("/:id", authenticate, requirePermission("compliance.program.write"), validate({ body: updateScoringPolicyBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { name, description, weights } = req.body;
  const result = await safeQuery(
  `UPDATE "${schema}".scoring_policies SET name=COALESCE($2,name), description=COALESCE($3,description), weights=COALESCE($4,weights), updated_at=NOW() WHERE policy_id=$1 RETURNING *`,
  [req.params.id, name, description, weights ? JSON.stringify(weights) : null]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Scoring policy not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "scoring-policy", entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'assessments', event: 'updated', entityType: 'scoring_policies', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:assessments.scoring_policies.updated' });
  res.json(getFirstRow(result));
}));

router.delete("/:id", authenticate, requirePermission("compliance.program.write"), validate({ body: genericComplianceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`DELETE FROM "${schema}".scoring_policies WHERE policy_id = $1 RETURNING policy_id`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Scoring policy not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "scoring-policy", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'assessments', event: 'deleted', entityType: 'scoring_policies', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:assessments.scoring_policies.deleted' });
  res.json({ deleted: true });
}));

export default router;

