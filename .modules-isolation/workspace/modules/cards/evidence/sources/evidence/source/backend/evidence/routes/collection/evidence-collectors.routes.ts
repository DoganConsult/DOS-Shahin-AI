import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Evidence Automated Collectors Routes
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emitEvent } from '../../ports/events.port';
import { enforceStatusTransition } from '../../ports/platform.port';
import { query as _query, safeQuery } from '../../ports/database.port';
import { errMsg } from "../../../../i18n/error-messages";
import { getFirstRow } from '@dos/db';
import { auditMiddleware, setAuditData, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';

import { createCollectorBody, updateCollectorBody, createRunAllBody, createRunBody } from "../../schemas/evidence.schemas";

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

// GET /api/evidence/collectors — List automated collectors
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user?.tenantId || req.tenantId;
  if (!tenantId) { res.json({ collectors: [] }); return; }
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT schedule_id AS id, schedule_name AS name, source_type AS "sourceType",
  collection_frequency AS schedule, last_collection_date AS "lastRun",
  last_collection_status AS "lastStatus", successful_collections AS "evidenceCount",
  0 AS "linkedControls", active, source_system AS "sourceSystem"
  FROM "${schema}".evidence_auto_collection
  ORDER BY created_at DESC`
  );
  res.json({ collectors: result.rows });
  } catch (_err: unknown) {
  res.json({ collectors: [] });
  }
});

// POST /api/evidence/collectors — Create a new collector
router.post("/", authenticate, requirePermission("evidence.item.write"), validate({ body: createCollectorBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { name, sourceType, schedule, endpointUrl, linkedControls } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".evidence_auto_collection
  (schedule_name, source_type, source_system, evidence_type, collection_frequency, connection_config, active, created_by)
  VALUES ($1, $2, $3, 'document', $4, $5, true, $6)
  RETURNING schedule_id AS id, schedule_name AS name, source_type AS "sourceType",
  collection_frequency AS schedule, active`,
  [name, sourceType || 'api', sourceType || 'api', schedule || 'daily',
  JSON.stringify({ endpointUrl: endpointUrl || '', linkedControls: linkedControls || '' }),
  req.user!.userId!]
  );
  setAuditData(res as any, { action: "create", entityType: "evidence_collector", entityId: getFirstRow(result)?.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'created', entityType: 'evidence_collector', entityId: getFirstRow(result)?.id || '' }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_collector.created' });
  res.status(201).json(getFirstRow(result));
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/collectors/run-all — Trigger all active collectors
router.post("/run-all", authenticate, requirePermission("evidence.item.write"), validate({ body: createRunAllBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const activeRes = await safeQuery(
  `SELECT schedule_id FROM "${schema}".evidence_auto_collection WHERE active = true`
  );
  for (const row of activeRes.rows) {
  await enforceStatusTransition(tenantId, {
  moduleCode: 'evidence', table: 'evidence_auto_collection', idColumn: 'schedule_id',
  entityId: row.schedule_id, toStatus: 'triggered', actorUserId: req.user!.userId!,
  statusColumn: 'last_collection_status', extraSets: 'last_collection_date = NOW()',
  }).catch(catchHandler(EC.EVENT_BUS, {}));
  }
  if (!activeRes.rows.length) {
  await safeQuery(
  `UPDATE "${schema}".evidence_auto_collection
  SET last_collection_date = NOW(), last_collection_status = 'triggered'
  WHERE active = true`
  );
  }
  setAuditData(res as any, { action: "update", entityType: "evidence_collector", entityId: "batch_run" });
  res.json({ message: 'All active collectors triggered', triggered: true });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// PATCH /api/evidence/collectors/:id — Update a collector
router.patch("/:id", authenticate, requirePermission("evidence.item.write"), validate({ body: updateCollectorBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { name, sourceType, schedule, endpointUrl, linkedControls } = req.body;
  const result = await safeQuery(
  `UPDATE "${schema}".evidence_auto_collection
  SET schedule_name = COALESCE($1, schedule_name),
  source_type = COALESCE($2, source_type),
  collection_frequency = COALESCE($3, collection_frequency),
  connection_config = COALESCE($4, connection_config),
  updated_at = NOW()
  WHERE schedule_id = $5
  RETURNING schedule_id AS id, schedule_name AS name, source_type AS "sourceType",
  collection_frequency AS schedule, active`,
  [name || null, sourceType || null, schedule || null,
  endpointUrl || linkedControls ? JSON.stringify({ endpointUrl: endpointUrl || '', linkedControls: linkedControls || '' }) : null,
  req.params.id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "evidence_collector", entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_collector', entityId: req.params.id }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_collector.updated' });
  res.json(getFirstRow(result));
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/collectors/:id/run — Trigger a single collector
router.post("/:id/run", authenticate, requirePermission("evidence.item.write"), validate({ body: createRunBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const enforcement = await enforceStatusTransition(tenantId, {
  moduleCode: 'evidence', table: 'evidence_auto_collection', idColumn: 'schedule_id',
  entityId: req.params.id, toStatus: 'triggered', actorUserId: req.user!.userId!,
  statusColumn: 'last_collection_status', extraSets: 'last_collection_date = NOW()',
  });
  if (enforcement.blocked) { res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return; }
  if (!enforcement.success) {
  const result = await safeQuery(
  `UPDATE "${schema}".evidence_auto_collection
  SET last_collection_date = NOW(), last_collection_status = 'triggered', updated_at = NOW()
  WHERE schedule_id = $1 RETURNING schedule_id AS id`, [req.params.id]);
  if (result.rows.length === 0) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  }
  setAuditData(res as any, { action: "update", entityType: "evidence_collector", entityId: req.params.id });
  res.json({ message: 'Collector run triggered', id: req.params.id });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

