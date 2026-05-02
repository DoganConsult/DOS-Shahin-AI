import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Evidence File Storage Routes — Upload, download, list files
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { recordActivity } from '../../ports/platform.port';
import {
  uploadEvidenceFile,
  downloadEvidenceFile,
  listEvidenceFiles,
} from '../../services/core/evidence.service';
import { emitEvent, notifyDomainChange, pushToTenant, buildWSEvent } from '../../ports/events.port';
import { errMsg } from "../../../../i18n/error-messages";
import { toErrorMessage } from '@dos/module-sdk';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

import { validate, auditMiddleware, setAuditData, moduleStack } from '../../ports/middleware.port';

import { createUploadBody } from '../../schemas/evidence.schemas';

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

// POST /api/evidence/:id/upload — Upload a file attachment to evidence
router.post("/:id/upload", authenticate, requirePermission("evidence.item.write"), upload.single('file'), validate({ body: createUploadBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const file = req.file;
  if (!file) return res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
  const result = await uploadEvidenceFile(
  tenantId, req.params.id, file.buffer, file.originalname,
  req.user!.userId!, file.mimetype
  );
  setAuditData(res as any, { action: "update", entityType: "evidence", entityId: req.params.id, afterState: { filename: file.originalname } });
  emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence', entityId: req.params.id, data: { filename: file.originalname } }).catch(catchHandler(EC.EVENT_BUS, {}));
  notifyDomainChange(tenantId, 'evidence', 'update', req.params.id);
  // G9: WebSocket notification for file upload
  pushToTenant(tenantId, buildWSEvent('evidence_file_uploaded' as any, {
  evidenceId: req.params.id,
  fileName: file.originalname,
  uploadedBy: req.user!.userId!,
  }));
  try { await recordActivity(tenantId, { userId: req.user!.userId!, module: 'evidence', action: 'upload', entityType: 'evidence', entityId: req.params.id, summary: `File uploaded: ${file.originalname}`, changes: {} }); } catch { }
  res.status(201).json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404
  : toErrorMessage(err).includes('not allowed') || toErrorMessage(err).includes('exceeds maximum') ? 400
  : 500;
  res.status(status).json({ error: status === 404 ? errMsg('EVIDENCE_NOT_FOUND', req) : status === 400 ? errMsg('VALIDATION_FAILED', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/:id/download — Download the evidence file
router.get("/:id/download", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const { buffer, filename, contentType } = await downloadEvidenceFile(tenantId, req.params.id);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', contentType);
  res.send(buffer);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('No file') ? 404 : 500;
  res.status(status).json({ error: status === 404 ? errMsg('EVIDENCE_NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/:id/files — List all files attached to evidence
router.get("/:id/files", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const files = await listEvidenceFiles(tenantId, req.params.id);
  res.json({ files, count: files.length });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

