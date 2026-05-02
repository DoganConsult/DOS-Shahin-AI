"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeLifecycleRouter = void 0;
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
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./employee-lifecycle.service"));
const foundation_schemas_1 = require("./foundation.schemas");
const rate_limiter_1 = require("./middleware/rate-limiter");
const router = (0, express_1.Router)();
exports.employeeLifecycleRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, middleware_port_1.auditMiddleware)('employee_lifecycle'));
const READ = ['admin', 'foundation_admin', 'hr_manager', 'line_manager', 'foundation.record.read'];
const WRITE = ['admin', 'foundation_admin', 'hr_manager'];
// ─── State + history ────────────────────────────────────────────────────────
router.get('/queues/onboarding', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listOnboardingKanban(req.tenantId);
    res.json({ success: true, data });
}));
router.get('/queues/probation-due', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const within = parseInt(req.query.withinDays || '14', 10);
    const data = await svc.listProbationDue(req.tenantId, { withinDays: within });
    res.json({ success: true, data });
}));
router.get('/queues/by-state/:state', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const state = req.params.state;
    if (!foundation_schemas_1.lifecycleStateValues.includes(state)) {
        res.status(400).json({ success: false, error: 'invalid_state' });
        return;
    }
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '25', 10);
    const result = await svc.listByState(req.tenantId, state, { page, pageSize });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));
router.get('/metrics', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.getMetrics(req.tenantId);
    res.json({ success: true, data });
}));
router.get('/workflows/:code', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tpl = await svc.getWorkflowTemplate(req.tenantId, req.params.code);
    if (!tpl) {
        res.status(404).json({ success: false, error: 'not_found' });
        return;
    }
    res.json({ success: true, data: tpl });
}));
// ─── Per-user ───────────────────────────────────────────────────────────────
router.get('/:userId', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const state = await svc.getCurrentState(req.tenantId, req.params.userId);
    res.json({ success: true, data: state });
}));
router.get('/:userId/history', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    const data = await svc.getHistory(req.tenantId, req.params.userId, limit);
    res.json({ success: true, data });
}));
router.get('/:userId/tasks', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listTasks(req.tenantId, {
        userId: req.params.userId,
        workflowId: req.query.workflowId,
        status: req.query.status,
    });
    res.json({ success: true, data });
}));
router.post('/:userId/transition', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...WRITE), (0, middleware_port_1.validate)({ body: foundation_schemas_1.lifecycleTransitionBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    try {
        const result = await svc.transition(req.tenantId, {
            userId: req.params.userId,
            toState: req.body.to_state,
            actorId: req.user.userId,
            reason: req.body.reason,
            evidenceRefs: req.body.evidence_refs,
            approvedBy: req.body.approved_by,
            meta: req.body.meta,
        });
        (0, middleware_port_1.setAuditData)(res, {
            entityId: req.params.userId,
            entityType: 'employee',
            action: `lifecycle:${req.body.to_state}`,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        if (err instanceof svc.LifecycleStateMachineError) {
            res.status(409).json({ success: false, error: err.code, message: err.message, details: err.details });
            return;
        }
        throw err;
    }
}));
// ─── Tasks ──────────────────────────────────────────────────────────────────
router.post('/tasks/:taskId/complete', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...WRITE, 'line_manager'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.lifecycleTaskCompleteBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.completeTask(req.tenantId, req.params.taskId, req.user.userId, req.body.evidence_refs);
    if (!row) {
        res.status(404).json({ success: false, error: 'not_found_or_done' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.taskId, entityType: 'lifecycle_task', action: 'complete' });
    res.json({ success: true, data: row });
}));
router.post('/tasks/:taskId/block', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...WRITE, 'line_manager'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.lifecycleTaskBlockBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.blockTask(req.tenantId, req.params.taskId, req.body.reason);
    if (!row) {
        res.status(404).json({ success: false, error: 'not_found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.taskId, entityType: 'lifecycle_task', action: 'block' });
    res.json({ success: true, data: row });
}));
//# sourceMappingURL=employee-lifecycle.routes.js.map