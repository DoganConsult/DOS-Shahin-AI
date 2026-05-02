/**
 * Foundation — Employee Lifecycle routes (G1).
 * Mounted at /api/foundation/employee-lifecycle (or via foundation router).
 *
 * Endpoints:
 *   GET    /:userId                    Current state for an employee
 *   GET    /:userId/history            Transition history
 *   GET    /:userId/tasks              Tasks for the current workflow
 *   POST   /:userId/transition         Transition to a new state
 *   POST   /tasks/:taskId/complete     Mark task done with evidence
 *   POST   /tasks/:taskId/block        Block task with reason
 *   GET    /queues/onboarding          Kanban (hired / onboarding / probation)
 *   GET    /queues/probation-due       Probation reviews due
 *   GET    /queues/by-state/:state     List employees in a state
 *   GET    /metrics                    Counts + overdue + avg-days per state
 *   GET    /workflows/:code            Read a workflow template
 */
import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './employee-lifecycle.service';
import {
  lifecycleTransitionBody,
  lifecycleTaskCompleteBody,
  lifecycleTaskBlockBody,
  lifecycleStateValues,
} from './foundation.schemas';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('employee_lifecycle'));

const READ = ['admin','foundation_admin','hr_manager','line_manager','foundation.record.read'] as const;
const WRITE = ['admin','foundation_admin','hr_manager'] as const;

// ─── State + history ────────────────────────────────────────────────────────
router.get('/queues/onboarding',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listOnboardingKanban(req.tenantId!);
    res.json({ success: true, data });
  }),
);

router.get('/queues/probation-due',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const within = parseInt((req.query.withinDays as string) || '14', 10);
    const data = await svc.listProbationDue(req.tenantId!, { withinDays: within });
    res.json({ success: true, data });
  }),
);

router.get('/queues/by-state/:state',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const state = req.params.state as svc.LifecycleState;
    if (!(lifecycleStateValues as readonly string[]).includes(state)) {
      res.status(400).json({ success: false, error: 'invalid_state' });
      return;
    }
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const result = await svc.listByState(req.tenantId!, state, { page, pageSize });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

router.get('/metrics',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.getMetrics(req.tenantId!);
    res.json({ success: true, data });
  }),
);

router.get('/workflows/:code',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const tpl = await svc.getWorkflowTemplate(req.tenantId!, req.params.code);
    if (!tpl) { res.status(404).json({ success: false, error: 'not_found' }); return; }
    res.json({ success: true, data: tpl });
  }),
);

// ─── Per-user ───────────────────────────────────────────────────────────────
router.get('/:userId',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const state = await svc.getCurrentState(req.tenantId!, req.params.userId);
    res.json({ success: true, data: state });
  }),
);

router.get('/:userId/history',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const data = await svc.getHistory(req.tenantId!, req.params.userId, limit);
    res.json({ success: true, data });
  }),
);

router.get('/:userId/tasks',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listTasks(req.tenantId!, {
      userId:     req.params.userId,
      workflowId: req.query.workflowId as string | undefined,
      status:     req.query.status as string | undefined,
    });
    res.json({ success: true, data });
  }),
);

router.post('/:userId/transition',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: lifecycleTransitionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await svc.transition(req.tenantId!, {
        userId:        req.params.userId,
        toState:       req.body.to_state,
        actorId:       req.user!.userId,
        reason:        req.body.reason,
        evidenceRefs:  req.body.evidence_refs,
        approvedBy:    req.body.approved_by,
        meta:          req.body.meta,
      });
      setAuditData(res, {
        entityId:   req.params.userId,
        entityType: 'employee',
        action:     `lifecycle:${req.body.to_state}`,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof svc.LifecycleStateMachineError) {
        res.status(409).json({ success: false, error: err.code, message: err.message, details: err.details });
        return;
      }
      throw err;
    }
  }),
);

// ─── Tasks ──────────────────────────────────────────────────────────────────
router.post('/tasks/:taskId/complete',
  writeRateLimiter,
  requireAnyPermission(...WRITE, 'line_manager'),
  validate({ body: lifecycleTaskCompleteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.completeTask(req.tenantId!, req.params.taskId, req.user!.userId, req.body.evidence_refs);
    if (!row) { res.status(404).json({ success: false, error: 'not_found_or_done' }); return; }
    setAuditData(res, { entityId: req.params.taskId, entityType: 'lifecycle_task', action: 'complete' });
    res.json({ success: true, data: row });
  }),
);

router.post('/tasks/:taskId/block',
  writeRateLimiter,
  requireAnyPermission(...WRITE, 'line_manager'),
  validate({ body: lifecycleTaskBlockBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.blockTask(req.tenantId!, req.params.taskId, req.body.reason);
    if (!row) { res.status(404).json({ success: false, error: 'not_found' }); return; }
    setAuditData(res, { entityId: req.params.taskId, entityType: 'lifecycle_task', action: 'block' });
    res.json({ success: true, data: row });
  }),
);

export { router as employeeLifecycleRouter };
