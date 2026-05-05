// @ts-nocheck
// ============================================================================
// Personal Agent Approval & Activity Management
//
// Approve, reject, confirm agent activities, plus activity query helpers.
// ============================================================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { invalidateAllCaches, } from './personal-agent-cache.service';
// ============================================================================
// Activity Query
// ============================================================================
/** Get a single agent activity by ID */
export async function getAgentActivity(tenantId, activityId) {
    const schema = tenantSchema(tenantId);
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
/** Approve a pending agent activity */
export async function approveAgentActivity(tenantId, activityId, approvedBy) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".agent_activity_log
     SET status = 'approved', approved_by = $1, approved_at = NOW()
     WHERE activity_id = $2`, [approvedBy, activityId]);
    const activity = await getAgentActivity(tenantId, activityId);
    if (activity) {
        await safeQuery(`UPDATE "${schema}".personal_agent_assignments
       SET total_actions_approved = COALESCE(total_actions_approved, 0) + 1, updated_at = NOW()
       WHERE assignment_id = $1`, [activity.assignmentId]);
        await invalidateAllCaches(tenantId, activity.userId);
    }
    await recordAudit({
        tenantId, userId: approvedBy, module: 'foundation',
        action: 'agent_activity_approved', entityType: 'agent_activity',
        entityId: activityId, afterState: { status: 'approved' },
    });
    return (await getAgentActivity(tenantId, activityId));
}
/** Reject a pending agent activity */
export async function rejectAgentActivity(tenantId, activityId, rejectedBy, rejectionReason) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".agent_activity_log
     SET status = 'rejected', rejected_by = $1, rejected_at = NOW(), rejection_reason = $2
     WHERE activity_id = $3`, [rejectedBy, rejectionReason, activityId]);
    const activity = await getAgentActivity(tenantId, activityId);
    if (activity) {
        await safeQuery(`UPDATE "${schema}".personal_agent_assignments
       SET total_actions_rejected = total_actions_rejected + 1,
           updated_at = NOW()
       WHERE assignment_id = $1`, [activity.assignmentId]);
    }
    await recordAudit({
        tenantId,
        userId: rejectedBy,
        module: 'foundation',
        action: 'agent_activity_rejected',
        entityType: 'agent_activity',
        entityId: activityId,
        afterState: { status: 'rejected', reason: rejectionReason },
    });
    if (activity) {
        await invalidateAllCaches(tenantId, activity.userId);
    }
    return (await getAgentActivity(tenantId, activityId));
}
// ============================================================================
// Task Confirmation Workflow
// ============================================================================
/**
 * Confirm/Approve an agent activity with detailed confirmation metadata
 */
export async function confirmAgentActivity(tenantId, activityId, confirmedBy, confirmation) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
// ============================================================================
// Row Mapper
// ============================================================================
/** Map a database row to an AgentActivity object */
export function mapActivityRow(row) {
    return {
        activityId: row.activity_id,
        tenantId: row.tenant_id,
        assignmentId: row.assignment_id,
        userId: row.user_id,
        agentId: row.agent_id,
        activityType: row.activity_type,
        activityCategory: row.activity_category,
        entityType: row.entity_type,
        entityId: row.entity_id,
        actionTitle: row.action_title,
        actionDescription: row.action_description,
        actionPayload: typeof row.action_payload === 'string' ? JSON.parse(row.action_payload) : row.action_payload,
        processId: row.process_id,
        processStep: row.process_step,
        governanceRuleApplied: row.governance_rule_applied,
        policyRuleApplied: row.policy_rule_applied,
        slaDeadline: row.sla_deadline,
        slaHoursOverdue: row.sla_hours_overdue,
        triggeredBySla: row.triggered_by_sla,
        executionMode: row.execution_mode,
        requiredApproval: row.required_approval,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
        rejectedBy: row.rejected_by,
        rejectedAt: row.rejected_at,
        rejectionReason: row.rejection_reason,
        riskLevel: row.risk_level,
        complianceCheckPassed: row.compliance_check_passed,
        complianceCheckDetails: typeof row.compliance_check_details === 'string' ? JSON.parse(row.compliance_check_details) : row.compliance_check_details,
        status: row.status,
        result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
        errorMessage: row.error_message,
        executedAt: row.executed_at,
        completedAt: row.completed_at,
        durationMs: row.duration_ms,
        authTokenHash: row.auth_token_hash,
        authMethod: row.auth_method,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=personal-agent-approval.service.js.map