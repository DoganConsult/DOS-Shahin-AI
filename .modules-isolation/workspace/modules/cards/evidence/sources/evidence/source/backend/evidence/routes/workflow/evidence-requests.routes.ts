import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Evidence Requests Routes — CRUD for evidence collection requests
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emitEvent, notifyDomainChange } from '../../ports/events.port';
import { recordActivity } from '../../ports/platform.port';
import {
  getEvidenceRequests,
  createEvidenceRequest,
  getEvidenceRequestById,
  updateEvidenceRequest,
} from '../../services/core/evidence.service';
import { errMsg } from "../../../../i18n/error-messages";
import { createRequestBody, updateRequestBody } from "../../schemas/evidence.schemas";
import { auditMiddleware, setAuditData, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

// GET /api/evidence/requests — List evidence requests (supports foundation filters)
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { status, overdue, assignedTeamId, department_id, business_unit_id } = req.query;
  const requests = await getEvidenceRequests(tenantId, {
  status: status as string | undefined,
  overdue: overdue === '1',
  assignedTeamId: assignedTeamId as string | undefined,
  department_id: department_id as string | undefined,
  business_unit_id: business_unit_id as string | undefined,
  });
  res.json({ requests, count: requests.length });
});

// POST /api/evidence/requests — Create evidence request
router.post("/", authenticate, requirePermission("evidence.item.write"), validate({ body: createRequestBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const { controlId, frameworkCode, evidenceType, assignedTeamId, requestDetails, dueDate, priority } = req.body;
  if (!evidenceType || !dueDate) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const request = await createEvidenceRequest(tenantId, {
  controlId, frameworkCode, evidenceType, assignedTeamId, requestDetails, dueDate, priority, createdBy: userId,
  });

  setAuditData(res as any, { action: "create", entityType: "evidence_request", entityId: request.request_id, afterState: request });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'evidence', event: 'created', entityType: 'evidence_request', entityId: request.request_id, data: request } as any)), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_request.created' });

  notifyDomainChange(tenantId, 'evidence', 'create', request.request_id);

  try { await recordActivity(tenantId, { userId, module: 'evidence', action: 'create', entityType: 'evidence_request', entityId: request.request_id, summary: `Evidence request created: ${evidenceType}`, changes: {} }); } catch { }
  res.status(201).json(request);
});

// GET /api/evidence/requests/:requestId — Get request detail
router.get("/:requestId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const request = await getEvidenceRequestById(tenantId, req.params.requestId);
  if (!request) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(request);
});

// PATCH /api/evidence/requests/:requestId — Update request status
router.patch("/:requestId", authenticate, requirePermission("evidence.item.write"), validate({ body: updateRequestBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const { status: newStatus, submissionNotes } = req.body;
  const request = await updateEvidenceRequest(tenantId, req.params.requestId, {
  status: newStatus, submissionNotes, submittedBy: newStatus === 'submitted' ? userId : undefined,
  });
  if (!request) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "evidence_request", entityId: req.params.requestId, afterState: request });
  emitEvent({ tenantId, userId, module: 'evidence', event: 'updated', entityType: 'evidence_request', entityId: req.params.requestId, data: { status: newStatus } }).catch(catchHandler(EC.EVENT_BUS, {}));
  try { await recordActivity(tenantId, { userId, module: 'evidence', action: 'update', entityType: 'evidence_request', entityId: req.params.requestId, summary: `Evidence request updated to ${newStatus}`, changes: { status: newStatus } }); } catch { }
  res.json(request);
});

export default router;

