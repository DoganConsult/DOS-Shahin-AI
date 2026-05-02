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
exports.complianceFabricRouter = void 0;
/**
 * Foundation — Compliance Fabric routes (G7).
 *
 * Mounted under /api/foundation. Endpoints:
 *   /policy-acks         — list / assign / record / coverage
 *   /training/courses    — list courses
 *   /training            — list / assign / complete / metrics
 *   /coi                 — submit / list / review
 */
const express_1 = require("express");
const zod_1 = require("zod");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./compliance-fabric.service"));
const rate_limiter_1 = require("./middleware/rate-limiter");
const assignAckBody = zod_1.z.object({
    user_id: zod_1.z.string().min(1).max(255),
    policy_id: zod_1.z.string().min(1).max(255),
    policy_version: zod_1.z.string().min(1).max(64),
    required: zod_1.z.boolean().optional(),
    due_at: zod_1.z.string().optional().nullable(),
});
const recordAckBody = zod_1.z.object({
    evidence_ref: zod_1.z.string().max(500).optional(),
});
const assignTrainingBody = zod_1.z.object({
    user_id: zod_1.z.string().min(1).max(255),
    course_code: zod_1.z.string().min(1).max(64),
    due_at: zod_1.z.string().optional().nullable(),
    reason: zod_1.z.string().max(500).optional(),
    pass_threshold: zod_1.z.number().min(0).max(100).optional(),
});
const completeTrainingBody = zod_1.z.object({
    score: zod_1.z.number().min(0).max(100).optional(),
    evidence_ref: zod_1.z.string().max(500).optional(),
});
const submitCoiBody = zod_1.z.object({
    user_id: zod_1.z.string().min(1).max(255),
    declaration_period: zod_1.z.string().min(1).max(32),
    has_conflicts: zod_1.z.boolean(),
    disclosures: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string().max(64),
        party: zod_1.z.string().max(255),
        nature: zod_1.z.string().max(2000),
        since: zod_1.z.string().optional(),
    })).max(50).optional(),
    evidence_ref: zod_1.z.string().max(500).optional(),
});
const reviewCoiBody = zod_1.z.object({
    decision: zod_1.z.enum(['cleared', 'mitigation_required', 'blocked']),
    note: zod_1.z.string().max(2000).optional(),
});
const router = (0, express_1.Router)();
exports.complianceFabricRouter = router;
router.use(auth_adapter_1.authenticate, auth_adapter_1.requireTenantId, (0, middleware_port_1.auditMiddleware)('foundation_compliance'));
const READ = ['admin', 'foundation_admin', 'hr_manager', 'line_manager', 'auditor', 'compliance_officer', 'foundation.record.read'];
const WRITE = ['admin', 'foundation_admin', 'hr_manager', 'compliance_officer'];
const REVIEW = ['admin', 'foundation_admin', 'compliance_officer', 'auditor'];
// ─── Policy acknowledgments ─────────────────────────────────────────────────
router.get('/policy-acks', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listPolicyAcks(req.tenantId, {
        userId: req.query.userId,
        policyId: req.query.policyId,
        status: req.query.status,
    });
    res.json({ success: true, data });
}));
router.get('/policy-acks/coverage', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.getPolicyAckCoverage(req.tenantId);
    res.json({ success: true, data });
}));
router.post('/policy-acks', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...WRITE), (0, middleware_port_1.validate)({ body: assignAckBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.assignPolicyAck(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.id, entityType: 'policy_ack', action: 'assign' });
    res.status(201).json({ success: true, data: row });
}));
router.post('/policy-acks/:id/acknowledge', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.validate)({ body: recordAckBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.recordPolicyAck(req.tenantId, req.params.id, {
        evidence_ref: req.body.evidence_ref,
        ip_address: req.ip,
        user_agent: req.get('user-agent') ?? undefined,
    });
    if (!row) {
        res.status(404).json({ success: false, error: 'not_found_or_done' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'policy_ack', action: 'acknowledge' });
    res.json({ success: true, data: row });
}));
// ─── Training ───────────────────────────────────────────────────────────────
router.get('/training/courses', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listTrainingCourses(req.tenantId);
    res.json({ success: true, data });
}));
router.get('/training', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listTrainingAssignments(req.tenantId, {
        userId: req.query.userId,
        status: req.query.status,
        courseCode: req.query.courseCode,
    });
    res.json({ success: true, data });
}));
router.get('/training/metrics', (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.getTrainingComplianceMetrics(req.tenantId);
    res.json({ success: true, data });
}));
router.post('/training', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...WRITE), (0, middleware_port_1.validate)({ body: assignTrainingBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.assignTraining(req.tenantId, req.body, req.user.userId);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.id, entityType: 'training_assignment', action: 'assign' });
    res.status(201).json({ success: true, data: row });
}));
router.post('/training/:id/complete', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.validate)({ body: completeTrainingBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.completeTraining(req.tenantId, req.params.id, req.body, req.user.userId);
    if (!row) {
        res.status(404).json({ success: false, error: 'not_found_or_done' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'training_assignment', action: 'complete' });
    res.json({ success: true, data: row });
}));
// ─── COI ────────────────────────────────────────────────────────────────────
router.post('/coi', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...READ), (0, middleware_port_1.validate)({ body: submitCoiBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.submitCoiDeclaration(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { entityId: row.id, entityType: 'coi_declaration', action: 'submit' });
    res.status(201).json({ success: true, data: row });
}));
router.get('/coi', (0, auth_adapter_1.requireAnyPermission)(...REVIEW), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const data = await svc.listCoiDeclarations(req.tenantId, {
        period: req.query.period,
        userId: req.query.userId,
        pendingReview: req.query.pendingReview === 'true',
    });
    res.json({ success: true, data });
}));
router.post('/coi/:id/review', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requireAnyPermission)(...REVIEW), (0, middleware_port_1.validate)({ body: reviewCoiBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await svc.reviewCoiDeclaration(req.tenantId, req.params.id, req.body, req.user.userId);
    if (!row) {
        res.status(404).json({ success: false, error: 'not_found_or_already_reviewed' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { entityId: req.params.id, entityType: 'coi_declaration', action: `review:${req.body.decision}` });
    res.json({ success: true, data: row });
}));
//# sourceMappingURL=compliance-fabric.routes.js.map