import { Request, Response, Router } from 'express';
import { z } from "zod";
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';

const genericPayloadSchema = z.record(z.unknown());

import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
/**
 * Control Workflow Routes — AGRC-OS Controls Module
 * Endpoints for test scheduling, team assignment, evidence requests,
 * remediation reviews, and health snapshots.
 */

import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { validate, auditMiddleware, automationMiddleware, fieldRbacFilter, asyncHandler } from '../ports/middleware.port';

import { ControlWorkflowService } from "../services/control-workflow.service";
import { ControlHealthSnapshotService } from "../services/control-health-snapshot.service";
import { ControlNotificationService } from "../services/control-notification.service";
import { scheduleTestBody, assignTeamBody, requestEvidenceBody, reviewRemediationBody, createScheduleTestBody, createAssignTeamBody, createRequestEvidenceBody, createReviewBody, createComputeBody } from "../schemas/controls.schemas";

const router = Router();
const workflowSvc = new ControlWorkflowService();
const snapshotSvc = new ControlHealthSnapshotService();
const notifySvc = new ControlNotificationService();

// ── Validation Schemas ───────────────────────────────────────────────
// ── Test Scheduling ──────────────────────────────────────────────────
router.post(
  "/schedule-test",
  authenticate,
  requirePermission("controls.test"),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  validate({ body: createScheduleTestBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = scheduleTestBody.parse(req.body);
    const tenantId = req.tenantId!;
    const result = await workflowSvc.scheduleTest(
      tenantId, body.controlId, body.testType, body.scheduledAt, body.testerId
    );
    await notifySvc.notifyTestDue(tenantId, body.controlId, body.testerId, body.scheduledAt);
    setAuditData(res as any, { action: 'schedule_test', entityType: 'control_test', entityId: body.controlId, afterState: result });
    res.status(201).json(result);
  })
);

// ── Team Assignment ──────────────────────────────────────────────────
router.post(
  "/assign-team",
  authenticate,
  requirePermission("control.record.write"),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  validate({ body: createAssignTeamBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = assignTeamBody.parse(req.body);
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    await workflowSvc.assignTeam(tenantId, body.controlId, body.teamId, userId);
    setAuditData(res as any, { action: 'assign_team', entityType: 'control', entityId: body.controlId, afterState: { teamId: body.teamId } });
    res.json({ success: true, message: "Team assigned" });
  })
);

// ── Evidence Request ─────────────────────────────────────────────────
router.post(
  "/request-evidence",
  authenticate,
  requirePermission("control.record.write"),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  validate({ body: createRequestEvidenceBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = requestEvidenceBody.parse(req.body);
    const tenantId = req.tenantId!;
    const result = await workflowSvc.requestEvidence(
      tenantId, body.controlId, body.evidenceTypeCode, body.assignedTo
    );
    setAuditData(res as any, { action: 'request_evidence', entityType: 'control_evidence_request', entityId: body.controlId, afterState: result });
    res.status(201).json(result);
  })
);

// ── Remediation Review ───────────────────────────────────────────────
router.post(
  "/remediation/:actionId/review",
  authenticate,
  requirePermission("control.record.write"),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  validate({ body: createReviewBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = reviewRemediationBody.parse(req.body);
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    await workflowSvc.reviewRemediation(
      tenantId, req.params.actionId, userId, body.decision, body.comments || ""
    );
    setAuditData(res as any, { action: 'review_remediation', entityType: 'control_remediation', entityId: req.params.actionId, afterState: { decision: body.decision } });
    res.json({ success: true, message: `Review decision: ${body.decision}` });
  })
);

// ── Health Snapshots ─────────────────────────────────────────────────
router.get(
  "/health-snapshots/:controlId",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const days = parseInt(req.query.days as string) || 90;
    const snapshots = await snapshotSvc.getSnapshots(tenantId, req.params.controlId, days);
    res.json({ snapshots });
  })
);

// ── Compute Snapshots (admin/scheduler trigger) ──────────────────────
router.post(
  "/health-snapshots/compute",
  authenticate,
  requirePermission("controls.admin"),
  auditMiddleware("controls"),
  validate({ body: createComputeBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const result = await snapshotSvc.computeAndStoreSnapshots(tenantId);
    setAuditData(res as any, { action: 'compute_snapshots', entityType: 'control_health_snapshot', entityId: tenantId, afterState: result });
    res.json(result);
  })
);

export default router;

