// ============================================================================
// Personal Agent Activity Execution
//
// Executes agent activities on behalf of a user, applying process governance
// rules, company policy checks, and SLA-based activation logic.
// ============================================================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ============================================================================
// Agent Activity Execution (with Process Governance)
// ============================================================================
/**
 * Execute an agent activity on behalf of user.
 * Applies process governance, policy rules, and SLA checks.
 */
export async function executeAgentActivity(tenantId, userId, agentId, activity, context) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
// ============================================================================
// Activity Action Execution
// ============================================================================
/**
 * Execute the actual action for an approved activity via agent-runner service.
 * The agent inherits user roles and executes with those permissions.
 */
export async function executeActivityAction(tenantId, activityId, assignment, activity) {
    const schema = tenantSchema(tenantId);
    const startTime = Date.now();
    try {
        // Update status to executing
        await safeQuery(`UPDATE "${schema}".agent_activity_log
       SET status = 'executing', executed_at = NOW()
       WHERE activity_id = $1`, [activityId]);
        // Execute the actual action via agent-runner service
        const { executeAction } = await import('../agents/core/agent-runner.service.js');
        await executeAction(tenantId, assignment.agentId, {
            type: activity.activityType,
            entityType: activity.entityType,
            entityId: activity.entityId,
            title: activity.activityType,
            description: `Personal agent activity ${activityId}`,
            priority: 'medium',
            ...activity.actionPayload,
        });
        const durationMs = Date.now() - startTime;
        // Update status to completed
        await safeQuery(`UPDATE "${schema}".agent_activity_log
       SET status = 'completed', completed_at = NOW(), duration_ms = $1
       WHERE activity_id = $2`, [durationMs, activityId]);
        // Update assignment stats
        await safeQuery(`UPDATE "${schema}".personal_agent_assignments
       SET total_actions_executed = total_actions_executed + 1,
           updated_at = NOW()
       WHERE assignment_id = $1`, [assignment.assignmentId]);
    }
    catch (error) {
        const durationMs = Date.now() - startTime;
        await safeQuery(`UPDATE "${schema}".agent_activity_log
       SET status = 'failed', error_message = $1, completed_at = NOW(), duration_ms = $2
       WHERE activity_id = $3`, [toErrorMessage(error), durationMs, activityId]);
        throw error;
    }
}
// ============================================================================
// Process Governance Checking
// ============================================================================
/** Check process governance rules for an activity */
async function checkProcessGovernance(tenantId, assignment, activity) {
    const schema = tenantSchema(tenantId);
    if (!activity.processId) {
        return { allowed: true, requiresApproval: false, enforcementLevel: 'advisory' };
    }
    // Load process governance rules
    const rules = await safeQuery(`SELECT * FROM "${schema}".agent_process_governance_rules
     WHERE tenant_id = $1
       AND process_id = $2
       AND is_active = true
       AND (agent_ids IS NULL OR $3 = ANY(agent_ids))
       AND (activation_modes IS NULL OR $4 = ANY(activation_modes))
     ORDER BY enforcement_level DESC, created_at DESC
     LIMIT 1`, [tenantId, activity.processId, assignment.agentId, assignment.activationMode]);
    if (!rules.rows.length) {
        // Check global rules
        const globalRules = await safeQuery(`SELECT * FROM public.agent_process_governance_rules_global
       WHERE process_id = $1 AND is_active = true
       ORDER BY enforcement_level DESC
       LIMIT 1`, [activity.processId]);
        if (!globalRules.rows.length) {
            return { allowed: true, requiresApproval: false, enforcementLevel: 'advisory' };
        }
        const rule = getFirstRow(globalRules);
        return {
            allowed: true,
            requiresApproval: rule.requires_approval,
            ruleApplied: rule.rule_code,
            enforcementLevel: rule.enforcement_level,
        };
    }
    const rule = getFirstRow(rules);
    const riskLevel = activity.riskLevel || 'low';
    const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const maxRisk = riskOrder[rule.max_risk_level] || 1;
    const actionRisk = riskOrder[riskLevel] || 0;
    if (actionRisk > maxRisk && rule.requires_approval) {
        return {
            allowed: true,
            requiresApproval: true,
            reason: `Risk level ${riskLevel} exceeds max allowed ${rule.max_risk_level} for process ${activity.processId}`,
            ruleApplied: rule.rule_code,
            enforcementLevel: rule.enforcement_level,
        };
    }
    return {
        allowed: true,
        requiresApproval: rule.requires_approval,
        ruleApplied: rule.rule_code,
        enforcementLevel: rule.enforcement_level,
    };
}
// ============================================================================
// Company Policy Checking
// ============================================================================
/** Check company policy rules from the assignment configuration */
async function checkCompanyPolicy(_tenantId, assignment, activity) {
    // Apply company policy rules from assignment
    const policyRules = assignment.companyPolicyRules;
    // Simple policy check (can be enhanced with JSONLogic evaluation)
    if (policyRules[activity.activityType]?.blocked === true) {
        return {
            allowed: false,
            requiresApproval: false,
            reason: `Company policy blocks ${activity.activityType}`,
            compliancePassed: false,
            enforcementLevel: 'blocking',
        };
    }
    if (policyRules[activity.activityType]?.requiresApproval === true) {
        return {
            allowed: true,
            requiresApproval: true,
            reason: `Company policy requires approval for ${activity.activityType}`,
            compliancePassed: true,
            enforcementLevel: 'advisory',
        };
    }
    return {
        allowed: true,
        requiresApproval: false,
        compliancePassed: true,
        enforcementLevel: 'advisory',
    };
}
//# sourceMappingURL=personal-agent-activity.service.js.map