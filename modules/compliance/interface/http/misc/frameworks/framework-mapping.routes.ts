import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../../../../ports/database.port';
import { getFirstRow, getFirstRowOrThrow } from '@dos/db';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { createMappingBody, genericComplianceSchema } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

router.get("/", authenticate, requirePermission("framework.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
  `SELECT fm.*, sf.name as source_name, tf.name as target_name
  FROM "${schema}".framework_mappings fm
  LEFT JOIN "${schema}".frameworks sf ON fm.source_framework_id = sf.framework_id
  LEFT JOIN "${schema}".frameworks tf ON fm.target_framework_id = tf.framework_id
  ORDER BY fm.created_at DESC`
  );
  res.json({ mappings: result.rows, count: result.rows.length });
}));

router.post("/", authenticate, requirePermission("framework.record.manage"), validate({ body: createMappingBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { source_framework_id, target_framework_id, coverage } = req.body;
  if (!source_framework_id || !target_framework_id) { res.status(400).json({ error: "source and target framework IDs required" }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".framework_mappings (source_framework_id, target_framework_id, coverage, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
  [source_framework_id, target_framework_id, coverage || 0, req.user?.userId]
  );
  const created = getFirstRowOrThrow(result, 'Framework mapping creation failed');
  setAuditData(res as any, { action: "create", entityType: "framework_mapping", entityId: created.mapping_id, afterState: created });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'frameworks', event: 'created', entityType: 'framework_mapping', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:frameworks.framework_mapping.created' });
  res.status(201).json(created);
}));

router.delete("/:id", authenticate, requirePermission("framework.record.manage"), validate({ body: genericComplianceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`DELETE FROM "${schema}".framework_mappings WHERE mapping_id = $1 RETURNING mapping_id`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Mapping not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "framework_mapping", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'frameworks', event: 'deleted', entityType: 'framework_mapping', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:frameworks.framework_mapping.deleted' });
  res.json({ deleted: true });
}));

export default router;

