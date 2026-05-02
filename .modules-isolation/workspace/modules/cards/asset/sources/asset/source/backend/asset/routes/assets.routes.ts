import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { createAssetBody, updateAssetBody } from "../schemas/asset.schemas";
import { idParam } from "../../../schemas/common.schemas";

import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, lifecycleGate, fieldRbacFilter, enforceMandatoryFields, enforceStageGates, requireOwnership, validate, moduleStack } from '../ports/middleware.port';
const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware("asset"));
router.use(automationMiddleware("asset"));
router.use(fieldRbacFilter("asset"));
router.use(enforceMandatoryFields("asset"));
router.use(enforceStageGates("asset"));

router.get("/", authenticate, requirePermission("asset.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const wsId = req.query.workspace_id as string | undefined;
  const result = wsId
  ? await safeQuery(`SELECT * FROM "${schema}".assets WHERE deleted_at IS NULL AND workspace_id = $1 ORDER BY created_at DESC`, [wsId])
  : await safeQuery(`SELECT * FROM "${schema}".assets WHERE deleted_at IS NULL ORDER BY created_at DESC`);
  res.json({ assets: result.rows, count: result.rows.length });
}));

router.get("/:id", authenticate, requirePermission("asset.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".assets WHERE asset_id = $1`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(getFirstRow(result));
}));

router.post("/", authenticate, requirePermission("asset.record.write"), validate({ body: createAssetBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { name, type, asset_type, criticality, owner, description,
  name_en, name_ar, custodian_id, cia_confidentiality, cia_integrity, cia_availability,
  lifecycle_status, department, location, ip_address, classification } = req.body;
  if (!name && !name_en) { res.status(400).json({ error: "name required" }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".assets
  (name, name_en, name_ar, type, criticality, owner, custodian_id, description,
  cia_confidentiality, cia_integrity, cia_availability, lifecycle_status,
  department, location, ip_address, classification, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
  [name || name_en, name_en || name || '', name_ar || '',
  type || asset_type || 'server', criticality || 'medium', owner || null, custodian_id || null,
  description || '',
  cia_confidentiality || 3, cia_integrity || 3, cia_availability || 3,
  lifecycle_status || 'active',
  department || null, location || null, ip_address || null, classification || 'internal',
  req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "asset", entityId: getFirstRow(result)?.asset_id, afterState: getFirstRow(result) });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'asset', event: 'created', entityType: 'asset', entityId: getFirstRow(result)?.asset_id, data: getFirstRow(result) } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  // Emit asset.inventory_updated when a new asset is added to inventory
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'asset', event: 'inventory_updated', entityType: 'asset', entityId: getFirstRow(result)?.asset_id, data: getFirstRow(result) } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.status(201).json(getFirstRow(result));
}));

router.put("/:id", authenticate, requirePermission("asset.record.write"), validate({ params: idParam, body: updateAssetBody }), lifecycleGate('asset'), requireOwnership('asset'), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const cols = Object.keys(req.body).filter(k => ['name','name_en','name_ar','type','criticality','owner','custodian_id','description','status','classification','department','location','ip_address','mac_address','os','cia_confidentiality','cia_integrity','cia_availability','lifecycle_status','last_reviewed_at','review_frequency','vendor','license_expiry'].includes(k));
  if (!cols.length) { res.status(400).json({ error: "No valid fields to update" }); return; }
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => req.body[c]);
  const result = await safeQuery(
  `UPDATE "${schema}".assets SET ${sets.join(', ')}, updated_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING *`,
  [req.params.id, ...vals]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Asset not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "asset", entityId: req.params.id as string, afterState: getFirstRow(result) });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'asset', event: 'updated', entityType: 'asset', entityId: req.params.id as string, data: getFirstRow(result) } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  // Emit asset.classified when the classification field was updated
  if (req.body.classification) {
    emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'asset', event: 'classified', entityType: 'asset', entityId: req.params.id as string, data: { classification: req.body.classification } } as any)).catch(catchHandler(EC.EVENT_BUS));
  }
  // Emit asset.inventory_updated for any asset modification
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'asset', event: 'inventory_updated', entityType: 'asset', entityId: req.params.id as string, data: getFirstRow(result) } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.json(getFirstRow(result));
}));

router.get("/stats/health", authenticate, requirePermission("asset.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const r = await safeQuery(`
  SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE criticality IN ('critical','high'))::int AS critical,
  COUNT(*) FILTER (WHERE owner IS NULL OR owner = '')::int AS without_owner,
  COUNT(*) FILTER (WHERE custodian_id IS NULL OR custodian_id = '')::int AS without_custodian,
  COUNT(*) FILTER (WHERE last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '12 months')::int AS not_reviewed
  FROM "${schema}".assets WHERE deleted_at IS NULL
  `);
  res.json(getFirstRow(r) || { total: 0, critical: 0, without_owner: 0, without_custodian: 0, not_reviewed: 0 });
}));

router.delete("/:id", authenticate, requirePermission("asset.record.write"), requireOwnership('asset'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
  `UPDATE "${schema}".assets SET deleted_at = NOW() WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Asset not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "asset", entityId: req.params.id as string });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'asset', event: 'deleted', entityType: 'asset', entityId: req.params.id as string } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ message: "Asset deleted", asset_id: getFirstRow(result)?.asset_id });
}));

export default router;

