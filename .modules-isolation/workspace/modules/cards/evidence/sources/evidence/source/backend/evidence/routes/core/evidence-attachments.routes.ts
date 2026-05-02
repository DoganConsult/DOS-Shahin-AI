import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Evidence Attachments Routes — Polymorphic entity-to-evidence file linking
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emitEvent } from '../../ports/events.port';
import { safeQuery } from '../../ports/database.port';
import { errMsg } from "../../../../i18n/error-messages";
import { initiateApproval } from "../../../workflow/services/approvals/approval-routing.service";
import { getFirstRow } from '@dos/db';
import { auditMiddleware, setAuditData, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createAttachmentBody } from "../../schemas/evidence.schemas";
import { idParam } from "../../../../schemas/common.schemas";

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

// GET /api/evidence/attachments — List attachments for an entity
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await safeQuery(
  `SELECT attachment_id AS id, entity_type AS "entityType", entity_id AS "entityId",
  evidence_type_code AS "evidenceTypeCode", file_name AS "fileName",
  file_size_bytes AS "fileSizeBytes", uploaded_by AS "uploadedByUserId",
  created_at AS "uploadedUtc"
  FROM "${schema}".evidence_attachments
  WHERE entity_type = $1 AND entity_id = $2
  ORDER BY created_at DESC`,
  [entityType, entityId]
  );
  res.json(result.rows);
});

// POST /api/evidence/attachments — Create a new attachment
router.post("/", authenticate, requirePermission("evidence.item.write"), validate({ body: createAttachmentBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  const userId = req.user!.userId!;
  const { entityType, entityId, evidenceTypeCode, fileName } = req.body;
  if (!entityType || !entityId || !evidenceTypeCode || !fileName) {
  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return;
  }
  const result = await safeQuery(
  `INSERT INTO "${schema}".evidence_attachments
  (entity_type, entity_id, evidence_type_code, file_name, uploaded_by)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING attachment_id AS id, entity_type AS "entityType", entity_id AS "entityId",
  evidence_type_code AS "evidenceTypeCode", file_name AS "fileName",
  0 AS "fileSizeBytes", uploaded_by AS "uploadedByUserId",
  created_at AS "uploadedUtc"`,
  [entityType, entityId, evidenceTypeCode, fileName, userId]
  );
  setAuditData(res as any, { action: "create", entityType: "evidence_attachment", entityId: getFirstRow(result)?.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId, module: 'evidence', event: 'created', entityType: 'evidence_attachment', entityId: getFirstRow(result)?.id || '' }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_attachment.created' });
  res.status(201).json(getFirstRow(result));
});

// DELETE /api/evidence/attachments/:id — Delete an attachment (approval required)
router.delete("/:id", authenticate, requirePermission("evidence.item.delete"), validate({ params: idParam }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;

  const approval = await initiateApproval(tenantId, {
  entityType: 'evidence_attachment',
  entityId: req.params.id as string,
  action: 'delete',
  requestedBy: userId,
  routeId: 'evidence-delete',
  context: { reason: req.body?.reason || 'Evidence attachment deletion requested' },
  });

  if (approval.status !== 'approved') {
  res.status(202).json({
  message: "Deletion pending approval",
  approvalId: approval.approvalId,
  status: approval.status,
  });
  return;
  }

  const schema = `tenant_${tenantId}`;
  const result = await safeQuery(
  `DELETE FROM "${schema}".evidence_attachments WHERE attachment_id = $1 RETURNING attachment_id`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "delete", entityType: "evidence_attachment", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId, module: 'evidence', event: 'deleted', entityType: 'evidence_attachment', entityId: req.params.id }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_attachment.deleted' });
  res.json({ success: true });
});

export default router;

