/**
 * Foundation — Compliance Fabric routes (G7).
 *
 * Mounted under /api/foundation. Endpoints:
 *   /policy-acks         — list / assign / record / coverage
 *   /training/courses    — list courses
 *   /training            — list / assign / complete / metrics
 *   /coi                 — submit / list / review
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './compliance-fabric.service';
import { writeRateLimiter } from './middleware/rate-limiter';

const assignAckBody = z.object({
  user_id:        z.string().min(1).max(255),
  policy_id:      z.string().min(1).max(255),
  policy_version: z.string().min(1).max(64),
  required:       z.boolean().optional(),
  due_at:         z.string().optional().nullable(),
});

const recordAckBody = z.object({
  evidence_ref: z.string().max(500).optional(),
});

const assignTrainingBody = z.object({
  user_id:        z.string().min(1).max(255),
  course_code:    z.string().min(1).max(64),
  due_at:         z.string().optional().nullable(),
  reason:         z.string().max(500).optional(),
  pass_threshold: z.number().min(0).max(100).optional(),
});

const completeTrainingBody = z.object({
  score:        z.number().min(0).max(100).optional(),
  evidence_ref: z.string().max(500).optional(),
});

const submitCoiBody = z.object({
  user_id:           z.string().min(1).max(255),
  declaration_period: z.string().min(1).max(32),
  has_conflicts:     z.boolean(),
  disclosures:       z.array(z.object({
    type:   z.string().max(64),
    party:  z.string().max(255),
    nature: z.string().max(2000),
    since:  z.string().optional(),
  })).max(50).optional(),
  evidence_ref:      z.string().max(500).optional(),
});

const reviewCoiBody = z.object({
  decision: z.enum(['cleared','mitigation_required','blocked']),
  note:     z.string().max(2000).optional(),
});

const router = Router();
router.use(authenticate, requireTenantId, auditMiddleware('foundation_compliance'));

const READ = ['admin','foundation_admin','hr_manager','line_manager','auditor','compliance_officer','foundation.record.read'] as const;
const WRITE = ['admin','foundation_admin','hr_manager','compliance_officer'] as const;
const REVIEW = ['admin','foundation_admin','compliance_officer','auditor'] as const;

// ─── Policy acknowledgments ─────────────────────────────────────────────────
router.get('/policy-acks',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listPolicyAcks(req.tenantId!, {
      userId:   req.query.userId as string | undefined,
      policyId: req.query.policyId as string | undefined,
      status:   req.query.status as 'pending' | 'completed' | 'overdue' | undefined,
    });
    res.json({ success: true, data });
  }),
);

router.get('/policy-acks/coverage',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.getPolicyAckCoverage(req.tenantId!);
    res.json({ success: true, data });
  }),
);

router.post('/policy-acks',
  writeRateLimiter, requireAnyPermission(...WRITE),
  validate({ body: assignAckBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.assignPolicyAck(req.tenantId!, req.body);
    setAuditData(res, { entityId: row.id, entityType: 'policy_ack', action: 'assign' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.post('/policy-acks/:id/acknowledge',
  writeRateLimiter, requireAnyPermission(...READ),
  validate({ body: recordAckBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.recordPolicyAck(req.tenantId!, req.params.id, {
      evidence_ref: req.body.evidence_ref,
      ip_address: req.ip,
      user_agent: req.get('user-agent') ?? undefined,
    });
    if (!row) { res.status(404).json({ success: false, error: 'not_found_or_done' }); return; }
    setAuditData(res, { entityId: req.params.id, entityType: 'policy_ack', action: 'acknowledge' });
    res.json({ success: true, data: row });
  }),
);

// ─── Training ───────────────────────────────────────────────────────────────
router.get('/training/courses',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listTrainingCourses(req.tenantId!);
    res.json({ success: true, data });
  }),
);

router.get('/training',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listTrainingAssignments(req.tenantId!, {
      userId:     req.query.userId as string | undefined,
      status:     req.query.status as string | undefined,
      courseCode: req.query.courseCode as string | undefined,
    });
    res.json({ success: true, data });
  }),
);

router.get('/training/metrics',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.getTrainingComplianceMetrics(req.tenantId!);
    res.json({ success: true, data });
  }),
);

router.post('/training',
  writeRateLimiter, requireAnyPermission(...WRITE),
  validate({ body: assignTrainingBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.assignTraining(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.id, entityType: 'training_assignment', action: 'assign' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.post('/training/:id/complete',
  writeRateLimiter, requireAnyPermission(...READ),
  validate({ body: completeTrainingBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.completeTraining(req.tenantId!, req.params.id, req.body, req.user!.userId);
    if (!row) { res.status(404).json({ success: false, error: 'not_found_or_done' }); return; }
    setAuditData(res, { entityId: req.params.id, entityType: 'training_assignment', action: 'complete' });
    res.json({ success: true, data: row });
  }),
);

// ─── COI ────────────────────────────────────────────────────────────────────
router.post('/coi',
  writeRateLimiter, requireAnyPermission(...READ),
  validate({ body: submitCoiBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.submitCoiDeclaration(req.tenantId!, req.body);
    setAuditData(res, { entityId: row.id, entityType: 'coi_declaration', action: 'submit' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.get('/coi',
  requireAnyPermission(...REVIEW),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listCoiDeclarations(req.tenantId!, {
      period: req.query.period as string | undefined,
      userId: req.query.userId as string | undefined,
      pendingReview: req.query.pendingReview === 'true',
    });
    res.json({ success: true, data });
  }),
);

router.post('/coi/:id/review',
  writeRateLimiter, requireAnyPermission(...REVIEW),
  validate({ body: reviewCoiBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.reviewCoiDeclaration(req.tenantId!, req.params.id, req.body, req.user!.userId);
    if (!row) { res.status(404).json({ success: false, error: 'not_found_or_already_reviewed' }); return; }
    setAuditData(res, { entityId: req.params.id, entityType: 'coi_declaration', action: `review:${req.body.decision}` });
    res.json({ success: true, data: row });
  }),
);

export { router as complianceFabricRouter };
