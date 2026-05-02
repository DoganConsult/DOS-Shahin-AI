import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Evidence Entity Integration Routes
// Policies, Controls, Risks, Frameworks — list, get, patch required types
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emitEvent } from '../../ports/events.port';
import { safeQuery } from '../../ports/database.port';
import { errMsg } from "../../../../i18n/error-messages";
import { getFirstRow } from '@dos/db';
import { auditMiddleware, setAuditData, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { requiredTypesBody } from "../../schemas/evidence.schemas";

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

// =====================================================================
// --- Policies ---
// =====================================================================

router.get("/policies", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT policy_id AS id, title, status, created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".policies WHERE deleted_at IS NULL ORDER BY title`
  );
  // Enrich with evidence_required from linked controls
  const rows = result.rows.map(( r: Record<string, unknown>) => ({
  ...r, tenantId, requiredEvidenceTypeCodes: [],
  }));
  res.json(rows);
});

router.get("/policies/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT policy_id AS id, title, status, created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json({ ...getFirstRow(result), tenantId, requiredEvidenceTypeCodes: [] });
});

router.patch("/policies/:id/required-types", authenticate, requirePermission("evidence.item.write"), validate({ body: requiredTypesBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { requiredEvidenceTypeCodes } = req.body;
  if (!Array.isArray(requiredEvidenceTypeCodes)) { res.status(400).json({ error: errMsg('INVALID_INPUT', req) }); return; }
  await safeQuery(
  `INSERT INTO "${schema}".evidence_attachments_config (entity_type, entity_id, required_type_codes)
  VALUES ('policy', $1, $2::text[])
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET required_type_codes = $2::text[], updated_at = NOW()`,
  [req.params.id, requiredEvidenceTypeCodes]
  );
  const result = await safeQuery(
  `SELECT policy_id AS id, title, status, created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  setAuditData(res as any, { action: "update", entityType: "evidence_attachment_config", entityId: req.params.id, afterState: { requiredEvidenceTypeCodes } });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_attachment_config', entityId: req.params.id }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_attachment_config.updated' });
  res.json({ ...getFirstRow(result), tenantId, requiredEvidenceTypeCodes });
});

// =====================================================================
// --- Controls ---
// =====================================================================

router.get("/controls", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT control_id AS id, control_id AS "controlRef", title, status,
  COALESCE(evidence_required, '{}') AS "requiredEvidenceTypeCodes",
  created_at AS "createdUtc", COALESCE(updated_at, created_at) AS "updatedUtc"
  FROM "${schema}".controls WHERE deleted_at IS NULL ORDER BY title`
  );
  const rows = result.rows.map(( r: Record<string, unknown>) => ({
  ...r, tenantId, severity: 'medium',
  requiredEvidenceTypeCodes: Array.isArray(r.requiredEvidenceTypeCodes) ? r.requiredEvidenceTypeCodes : [],
  }));
  res.json(rows);
});

router.get("/controls/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT control_id AS id, control_id AS "controlRef", title, status,
  COALESCE(evidence_required, '{}') AS "requiredEvidenceTypeCodes",
  created_at AS "createdUtc", COALESCE(updated_at, created_at) AS "updatedUtc"
  FROM "${schema}".controls WHERE control_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const r = getFirstRow(result)!;
  res.json({ ...r, tenantId, severity: 'medium',
  requiredEvidenceTypeCodes: Array.isArray(r.requiredEvidenceTypeCodes) ? r.requiredEvidenceTypeCodes : [],
  });
});

router.patch("/controls/:id/required-types", authenticate, requirePermission("evidence.item.write"), validate({ body: requiredTypesBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { requiredEvidenceTypeCodes } = req.body;
  if (!Array.isArray(requiredEvidenceTypeCodes)) { res.status(400).json({ error: errMsg('INVALID_INPUT', req) }); return; }
  await safeQuery(
  `UPDATE "${schema}".controls SET evidence_required = $2::text[] WHERE control_id = $1`,
  [req.params.id, requiredEvidenceTypeCodes]
  );
  const result = await safeQuery(
  `SELECT control_id AS id, control_id AS "controlRef", title, status,
  evidence_required AS "requiredEvidenceTypeCodes",
  created_at AS "createdUtc", COALESCE(updated_at, created_at) AS "updatedUtc"
  FROM "${schema}".controls WHERE control_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  setAuditData(res as any, { action: "update", entityType: "evidence_attachment_config", entityId: req.params.id, afterState: { requiredEvidenceTypeCodes } });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_attachment_config', entityId: req.params.id }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_attachment_config.updated' });
  res.json({ ...getFirstRow(result), tenantId, severity: 'medium' });
});

// =====================================================================
// --- Risks ---
// =====================================================================

router.get("/risks", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT risk_id AS id, title, status,
  CASE WHEN risk_score >= 15 THEN 'critical' WHEN risk_score >= 10 THEN 'high' WHEN risk_score >= 5 THEN 'medium' ELSE 'low' END AS severity,
  created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".risks WHERE deleted_at IS NULL ORDER BY title`
  );
  const rows = result.rows.map(( r: Record<string, unknown>) => ({ ...r, tenantId, requiredEvidenceTypeCodes: [] }));
  res.json(rows);
});

router.get("/risks/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT risk_id AS id, title, status,
  CASE WHEN risk_score >= 15 THEN 'critical' WHEN risk_score >= 10 THEN 'high' WHEN risk_score >= 5 THEN 'medium' ELSE 'low' END AS severity,
  created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json({ ...getFirstRow(result), tenantId, requiredEvidenceTypeCodes: [] });
});

router.patch("/risks/:id/required-types", authenticate, requirePermission("evidence.item.write"), validate({ body: requiredTypesBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { requiredEvidenceTypeCodes } = req.body;
  if (!Array.isArray(requiredEvidenceTypeCodes)) { res.status(400).json({ error: errMsg('INVALID_INPUT', req) }); return; }
  await safeQuery(
  `INSERT INTO "${schema}".evidence_attachments_config (entity_type, entity_id, required_type_codes)
  VALUES ('risk', $1, $2::text[])
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET required_type_codes = $2::text[], updated_at = NOW()`,
  [req.params.id, requiredEvidenceTypeCodes]
  );
  const result = await safeQuery(
  `SELECT risk_id AS id, title, status,
  CASE WHEN risk_score >= 15 THEN 'critical' WHEN risk_score >= 10 THEN 'high' WHEN risk_score >= 5 THEN 'medium' ELSE 'low' END AS severity,
  created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  setAuditData(res as any, { action: "update", entityType: "evidence_attachment_config", entityId: req.params.id, afterState: { requiredEvidenceTypeCodes } });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_attachment_config', entityId: req.params.id }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_attachment_config.updated' });
  res.json({ ...getFirstRow(result), tenantId, requiredEvidenceTypeCodes });
});

// =====================================================================
// --- Frameworks ---
// =====================================================================

router.get("/frameworks", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT framework_id AS id, framework_id AS key, name AS title,
  created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".frameworks WHERE deleted_at IS NULL ORDER BY name`
  );
  const rows = result.rows.map(( r: Record<string, unknown>) => ({ ...r, tenantId, defaultRequiredEvidenceTypeCodes: [] }));
  res.json(rows);
});

router.get("/frameworks/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `SELECT framework_id AS id, framework_id AS key, name AS title,
  created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".frameworks WHERE framework_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json({ ...getFirstRow(result), tenantId, defaultRequiredEvidenceTypeCodes: [] });
});

router.patch("/frameworks/:id/required-types", authenticate, requirePermission("evidence.item.write"), validate({ body: requiredTypesBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { requiredEvidenceTypeCodes } = req.body;
  if (!Array.isArray(requiredEvidenceTypeCodes)) { res.status(400).json({ error: errMsg('INVALID_INPUT', req) }); return; }
  await safeQuery(
  `INSERT INTO "${schema}".evidence_attachments_config (entity_type, entity_id, required_type_codes)
  VALUES ('framework', $1, $2::text[])
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET required_type_codes = $2::text[], updated_at = NOW()`,
  [req.params.id, requiredEvidenceTypeCodes]
  );
  const result = await safeQuery(
  `SELECT framework_id AS id, framework_id AS key, name AS title,
  created_at AS "createdUtc", updated_at AS "updatedUtc"
  FROM "${schema}".frameworks WHERE framework_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  setAuditData(res as any, { action: "update", entityType: "evidence_attachment_config", entityId: req.params.id, afterState: { requiredEvidenceTypeCodes } });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_attachment_config', entityId: req.params.id }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_attachment_config.updated' });
  res.json({ ...getFirstRow(result), tenantId, defaultRequiredEvidenceTypeCodes: requiredEvidenceTypeCodes });
});

export default router;

