import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Evidence Schedule Routes — CRUD for evidence collection schedules
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emitEvent, notifyDomainChange } from '../../ports/events.port';
import {
  createEvidenceSchedule,
  getEvidenceSchedules,
  updateEvidenceSchedule,
  deleteEvidenceSchedule,
} from '../../services/core/evidence.service';
import { errMsg } from "../../../../i18n/error-messages";
import { initiateApproval } from "../../../workflow/services/approvals/approval-routing.service";
import { idParam } from "../../../../schemas/common.schemas";
import { createScheduleBody, updateScheduleBody } from "../../schemas/evidence.schemas";

import { auditMiddleware, setAuditData, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

// GET /api/evidence/schedules — List all evidence schedules
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schedules = await getEvidenceSchedules(tenantId);
  res.json(schedules);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/schedules — Create evidence schedule
router.post("/", authenticate, requirePermission("evidence.item.write"), validate({ body: createScheduleBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schedule = await createEvidenceSchedule(tenantId, req.body);

  setAuditData(res as any, { action: "create", entityType: "evidence_schedule", entityId: schedule.schedule_id || 'new', afterState: schedule });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user.userId, module: 'evidence', event: 'created', entityType: 'evidence_schedule', entityId: schedule.schedule_id || 'new', data: schedule } as any)), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_schedule.created' });

  notifyDomainChange(tenantId, 'evidence', 'create', schedule.schedule_id || 'new');
  res.status(201).json(schedule);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// PUT /api/evidence/schedules/:id — Update evidence schedule
router.put("/:id", authenticate, requirePermission("evidence.item.write"), validate({ params: idParam, body: updateScheduleBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schedule = await updateEvidenceSchedule(tenantId, req.params.id as string, req.body);
  if (!schedule) {
  res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  return;
  }
  setAuditData(res as any, { action: "update", entityType: "evidence_schedule", entityId: req.params.id as string, afterState: schedule });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_schedule', entityId: req.params.id as string, data: schedule } as any)), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_schedule.updated' });
  notifyDomainChange(tenantId, 'evidence', 'update', req.params.id as string);
  res.json(schedule);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// DELETE /api/evidence/schedules/:id — Delete evidence schedule (approval required)
router.delete("/:id", authenticate, requirePermission("evidence.item.delete"), validate({ params: idParam }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;

  const approval = await initiateApproval(tenantId, {
  entityType: 'evidence_schedule',
  entityId: req.params.id as string,
  action: 'delete',
  requestedBy: userId,
  routeId: 'evidence-delete',
  context: { reason: req.body?.reason || 'Evidence schedule deletion requested' },
  });

  if (approval.status !== 'approved') {
  res.status(202).json({
  message: "Deletion pending approval",
  approvalId: approval.approvalId,
  status: approval.status,
  });
  return;
  }

  const deleted = await deleteEvidenceSchedule(tenantId, req.params.id as string);
  if (!deleted) {
  res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  return;
  }
  setAuditData(res as any, { action: "delete", entityType: "evidence_schedule", entityId: req.params.id as string });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId, module: 'evidence', event: 'deleted', entityType: 'evidence_schedule', entityId: req.params.id as string }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_schedule.deleted' });
  notifyDomainChange(tenantId, 'evidence', 'delete', req.params.id as string);
  res.json({ message: "Schedule deleted" });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

