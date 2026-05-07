import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { assignPersonalAgent, getPersonalAgentAssignment, updatePersonalAgentAssignment, executeAgentActivity, getAgentActivity, approveAgentActivity, rejectAgentActivity, checkSlaAndActivateAgent, getAgentDashboardSummary, getAgentAuditTrail, getAgentActivityTimeline, confirmAgentActivity, } from '../../services/personal/personal-agent.service.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { auditMiddleware, validate, requireTenant, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { assignPostBody, myAgentAgentIdPatchBody, consentPostBody, executePostBody, activitiesActivityIdApprovePostBody, activitiesActivityIdRejectPostBody, checkSlaPostBody, activitiesActivityIdConfirmPostBody } from "../../schemas/ai.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));
// ============================================================================
// Personal Agent Assignment
// ============================================================================
/**
 * POST /api/personal-agent/assign
 * Assign a dedicated agent to the current user
 */
router.post('/assign', authenticate, requireTenant, validate({ body: assignPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { agentId, agentNameEn, agentNameAr, activationMode = 'human', slaBasedActivation = false, slaThresholdHours, slaPriorityFilter, allowedActionTypes = [], blockedActionTypes = [], requiresApprovalFor = [], autoApproveBelowRisk = 'low', companyPolicyRules = {}, processGovernanceRules = {}, metadata = {}, } = req.body;
        if (!agentId) {
            return res.status(400).json({ error: 'agentId is required' });
        }
        const assignment = await assignPersonalAgent(tenantId, userId, agentId, {
            agentNameEn,
            agentNameAr,
            activationMode,
            slaBasedActivation,
            slaThresholdHours,
            slaPriorityFilter,
            allowedActionTypes,
            blockedActionTypes,
            requiresApprovalFor,
            autoApproveBelowRisk,
            companyPolicyRules,
            processGovernanceRules,
            metadata,
            createdBy: userId,
        });
        res.status(201).json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * GET /api/personal-agent/my-agent
 * Get current user's personal agent assignment
 */
router.get('/my-agent', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const agentId = req.query.agentId;
        const assignment = await getPersonalAgentAssignment(tenantId, userId, agentId);
        if (!assignment) {
            return res.status(404).json({ error: 'No personal agent assigned' });
        }
        res.json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * PATCH /api/personal-agent/my-agent/:agentId
 * Update personal agent assignment
 */
router.patch('/my-agent/:agentId', authenticate, requireTenant, validate({ body: myAgentAgentIdPatchBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { agentId } = req.params;
        const assignment = await updatePersonalAgentAssignment(tenantId, userId, agentId, req.body, userId);
        res.json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * POST /api/personal-agent/consent
 * Grant/revoke consent for personal agent
 */
router.post('/consent', authenticate, requireTenant, validate({ body: consentPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { agentId, granted, purpose } = req.body;
        if (!agentId) {
            return res.status(400).json({ error: 'agentId is required' });
        }
        const assignment = await updatePersonalAgentAssignment(tenantId, userId, agentId, {
            userConsentGranted: granted === true,
            consentPurpose: purpose,
        }, userId);
        res.json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
// ============================================================================
// Agent Activity Execution
// ============================================================================
/**
 * POST /api/personal-agent/execute
 * Execute an agent activity on behalf of user
 */
router.post('/execute', authenticate, requireTenant, validate({ body: executePostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { agentId, activityType, activityCategory, entityType, entityId, actionTitle, actionDescription, actionPayload, processId, processStep, riskLevel = 'low', slaDeadline, } = req.body;
        if (!agentId || !activityType || !activityCategory) {
            return res.status(400).json({
                error: 'agentId, activityType, and activityCategory are required',
            });
        }
        // Get auth token hash for audit
        const authTokenHash = req.headers.authorization
            ? Buffer.from(req.headers.authorization).toString('base64').substring(0, 50)
            : undefined;
        const result = await executeAgentActivity(tenantId, userId, agentId, {
            activityType,
            activityCategory,
            entityType,
            entityId,
            actionTitle,
            actionDescription,
            actionPayload: actionPayload || {},
            processId,
            processStep,
            riskLevel,
            slaDeadline,
        }, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            authTokenHash,
            authMethod: 'delegation_grant',
        });
        res.status(result.requiresApproval ? 202 : 200).json(result);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * GET /api/personal-agent/activities
 * Get agent activity history for current user
 */
router.get('/activities', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { agentId, status, limit = 50, offset = 0 } = req.query;
        const { safeQuery, tenantSchema } = await import('@dos/db');
        const schema = tenantSchema(tenantId);
        const conditions = ['tenant_id = $1', 'user_id = $2'];
        const params = [tenantId, userId];
        let paramIndex = 3;
        if (agentId) {
            conditions.push(`agent_id = $${paramIndex++}`);
            params.push(agentId);
        }
        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        params.push(Number(limit), Number(offset));
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_activity_log
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, params);
        res.json({
            activities: result.rows,
            total: result.rows.length,
        });
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * GET /api/personal-agent/activities/:activityId
 * Get specific agent activity
 */
router.get('/activities/:activityId', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { activityId } = req.params;
        const activity = await getAgentActivity(tenantId, activityId);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json(activity);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * POST /api/personal-agent/activities/:activityId/approve
 * Approve a pending agent activity
 */
router.post('/activities/:activityId/approve', authenticate, requireTenant, requirePermission('ai.personal-agent.approve'), validate({ body: activitiesActivityIdApprovePostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { activityId } = req.params;
        const activity = await approveAgentActivity(tenantId, activityId, userId);
        res.json(activity);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * POST /api/personal-agent/activities/:activityId/reject
 * Reject a pending agent activity
 */
router.post('/activities/:activityId/reject', authenticate, requireTenant, requirePermission('ai.personal-agent.approve'), validate({ body: activitiesActivityIdRejectPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { activityId } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        const activity = await rejectAgentActivity(tenantId, activityId, userId, reason);
        res.json(activity);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
// ============================================================================
// SLA-Based Activation
// ============================================================================
/**
 * POST /api/personal-agent/check-sla
 * Check for SLA breaches and activate agent if threshold passed
 */
router.post('/check-sla', authenticate, requireTenant, validate({ body: checkSlaPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const activatedActivities = await checkSlaAndActivateAgent(tenantId, userId);
        res.json({
            activated: activatedActivities.length,
            activities: activatedActivities,
        });
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
// ============================================================================
// Tenant Operation Mode Integration
// ============================================================================
/**
 * GET /api/personal-agent/tenant-mode
 * Get tenant operation mode (human/hyper/autonomous) and agent capabilities
 */
router.get('/tenant-mode', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        // Get tenant operation mode from tenant config
        const { safeQuery, tenantSchema } = await import('@dos/db');
        const schema = tenantSchema(tenantId);
        const tenantConfig = await safeQuery(`SELECT operation_mode, ai_autonomy_level
         FROM "${schema}".tenant_configurations
         WHERE tenant_id = $1
         LIMIT 1`, [tenantId]);
        const operationMode = getFirstRow(tenantConfig)?.operation_mode || 'human';
        const aiAutonomyLevel = getFirstRow(tenantConfig)?.ai_autonomy_level || 'low';
        // Get user's personal agent assignments
        const assignment = await getPersonalAgentAssignment(tenantId, userId);
        // Determine effective mode (tenant mode vs agent-specific mode)
        let effectiveMode = 'human';
        if (operationMode === 'autonomous' && assignment?.activationMode === 'autonomous') {
            effectiveMode = 'autonomous';
        }
        else if (operationMode === 'hyper' || assignment?.activationMode === 'hyper') {
            effectiveMode = 'hyper';
        }
        else {
            effectiveMode = 'human';
        }
        res.json({
            tenantOperationMode: operationMode,
            aiAutonomyLevel,
            agentActivationMode: assignment?.activationMode || 'human',
            effectiveMode,
            hasPersonalAgent: !!assignment,
            agentEnabled: assignment?.isEnabled || false,
            agentActive: assignment?.isActive || false,
            slaBasedActivation: assignment?.slaBasedActivation || false,
            inheritedRoles: assignment?.inheritedRoles || [],
            allowedActionTypes: assignment?.allowedActionTypes || [],
        });
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
// ============================================================================
// Visual Dashboard & Analytics
// ============================================================================
/**
 * GET /api/personal-agent/dashboard
 * Get comprehensive dashboard summary for agent activities
 */
router.get('/dashboard', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.query.userId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;
        const summary = await getAgentDashboardSummary(tenantId, userId, dateRange);
        res.json(summary);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * GET /api/personal-agent/audit-trail
 * Get detailed audit trail for agent activities with full context
 */
router.get('/audit-trail', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const filters = {
            userId: req.query.userId,
            agentId: req.query.agentId,
            activityType: req.query.activityType,
            status: req.query.status,
            entityType: req.query.entityType,
            entityId: req.query.entityId,
            dateRange: req.query.startDate && req.query.endDate ? {
                start: req.query.startDate,
                end: req.query.endDate,
            } : undefined,
        };
        const pagination = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50,
        };
        const result = await getAgentAuditTrail(tenantId, filters, pagination);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
/**
 * GET /api/personal-agent/timeline
 * Get activity timeline visualization data
 */
router.get('/timeline', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.query.userId;
        const days = parseInt(req.query.days) || 7;
        const timeline = await getAgentActivityTimeline(tenantId, userId, days);
        res.json(timeline);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
// ============================================================================
// Task Confirmation Workflow
// ============================================================================
/**
 * POST /api/personal-agent/activities/:activityId/confirm
 * Confirm/Approve an agent activity with detailed confirmation
 */
router.post('/activities/:activityId/confirm', authenticate, requireTenant, validate({ body: activitiesActivityIdConfirmPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const activityId = req.params.activityId;
        const confirmedBy = req.user.userId;
        const { approved, reason, notes, riskAssessment, complianceNotes, overridePolicy, overrideReason, } = req.body;
        if (typeof approved !== 'boolean') {
            res.status(400).json({ error: 'approved field is required and must be boolean' });
            return;
        }
        const activity = await confirmAgentActivity(tenantId, activityId, confirmedBy, {
            approved,
            reason,
            notes,
            riskAssessment,
            complianceNotes,
            overridePolicy,
            overrideReason,
        });
        res.json(activity);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
// ============================================================================
// Health & Diagnostics
// ============================================================================
/**
 * GET /api/personal-agent/health
 * Health check and diagnostics for personal-agent module
 * Returns: cache health, connection pool stats, module status
 */
router.get('/health', validate({ query: z.record(z.unknown()) }), authenticate, requireTenant, requirePermission('ai.personal-agent.write'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        // Import diagnostics function
        const { getPersonalAgentDiagnostics } = await import('../services/personal-agent.service.js');
        const diagnostics = await getPersonalAgentDiagnostics(tenantId);
        res.json(diagnostics);
    }
    catch (error) {
        res.status(500).json({ error: toErrorMessage(error) });
    }
});
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=personal-agent.routes.js.map