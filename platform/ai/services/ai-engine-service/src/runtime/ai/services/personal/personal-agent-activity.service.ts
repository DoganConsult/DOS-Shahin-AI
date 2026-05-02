// ============================================================================
// Personal Agent Activity Execution
//
// Executes agent activities on behalf of a user, applying process governance
// rules, company policy checks, and SLA-based activation logic.
// ============================================================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema, query as _query } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { eventBus } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { PersonalAgentAssignment, AgentActivity } from './personal-agent.types';
import { riskLevelOrder } from './personal-agent.types';
import { getPersonalAgentAssignment } from './personal-agent-assignment.service';
import { getAgentActivity, mapActivityRow as _mapActivityRow } from './personal-agent-approval.service';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

// ============================================================================
// Agent Activity Execution (with Process Governance)
// ============================================================================

/**
 * Execute an agent activity on behalf of user.
 * Applies process governance, policy rules, and SLA checks.
 */
export async function executeAgentActivity(
  tenantId: string,
  userId: string,
  agentId: string,
  activity: {
    activityType: string;
    activityCategory: string;
    entityType?: string;
    entityId?: string;
    actionTitle?: string;
    actionDescription?: string;
    actionPayload: Record<string, unknown>;
    processId?: string;
    processStep?: string;
    riskLevel?: string;
    slaDeadline?: string;
  },
  context?: {
    ipAddress?: string;
    userAgent?: string;
    authTokenHash?: string;
    authMethod?: string;
  }
): Promise<{ activity: AgentActivity; canProceed: boolean; requiresApproval: boolean; reason?: string }> {
      throw new Error("Not implemented: Stubbed during microservice extraction");
}

// ============================================================================
// Activity Action Execution
// ============================================================================

/**
 * Execute the actual action for an approved activity via agent-runner service.
 * The agent inherits user roles and executes with those permissions.
 */
export async function executeActivityAction(
  tenantId: string,
  activityId: string,
  assignment: PersonalAgentAssignment,
  activity: { activityType: string; actionPayload: Record<string, unknown>; entityType?: string; entityId?: string }
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const startTime = Date.now();

  try {
    // Update status to executing
    await safeQuery(
      `UPDATE "${schema}".agent_activity_log
       SET status = 'executing', executed_at = NOW()
       WHERE activity_id = $1`,
      [activityId]
    );

    // Execute the actual action via agent-runner service
    const { executeAction } = await import('../agents/core/agent-runner.service');

    await executeAction(tenantId, assignment.agentId, {
      type: activity.activityType,
      entityType: activity.entityType,
      entityId: activity.entityId,
      ...activity.actionPayload,
    } as unknown);

    const durationMs = Date.now() - startTime;

    // Update status to completed
    await safeQuery(
      `UPDATE "${schema}".agent_activity_log
       SET status = 'completed', completed_at = NOW(), duration_ms = $1
       WHERE activity_id = $2`,
      [durationMs, activityId]
    );

    // Update assignment stats
    await safeQuery(
      `UPDATE "${schema}".personal_agent_assignments
       SET total_actions_executed = total_actions_executed + 1,
           updated_at = NOW()
       WHERE assignment_id = $1`,
      [assignment.assignmentId]
    );

  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    await safeQuery(
      `UPDATE "${schema}".agent_activity_log
       SET status = 'failed', error_message = $1, completed_at = NOW(), duration_ms = $2
       WHERE activity_id = $3`,
      [toErrorMessage(error), durationMs, activityId]
    );
    throw error;
  }
}

// ============================================================================
// Process Governance Checking
// ============================================================================

/** Check process governance rules for an activity */
async function checkProcessGovernance(
  tenantId: string,
  assignment: PersonalAgentAssignment,
  activity: { processId?: string; processStep?: string; activityType: string; riskLevel?: string }
): Promise<{
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  ruleApplied?: string;
  enforcementLevel: 'blocking' | 'advisory' | 'informational';
}> {
  const schema = tenantSchema(tenantId);

  if (!activity.processId) {
    return { allowed: true, requiresApproval: false, enforcementLevel: 'advisory' };
  }

  // Load process governance rules
  const rules = await safeQuery(
    `SELECT * FROM "${schema}".agent_process_governance_rules
     WHERE tenant_id = $1
       AND process_id = $2
       AND is_active = true
       AND (agent_ids IS NULL OR $3 = ANY(agent_ids))
       AND (activation_modes IS NULL OR $4 = ANY(activation_modes))
     ORDER BY enforcement_level DESC, created_at DESC
     LIMIT 1`,
    [tenantId, activity.processId, assignment.agentId, assignment.activationMode]
  );

  if (!rules.rows.length) {
    // Check global rules
    const globalRules = await safeQuery(
      `SELECT * FROM public.agent_process_governance_rules_global
       WHERE process_id = $1 AND is_active = true
       ORDER BY enforcement_level DESC
       LIMIT 1`,
      [activity.processId]
    );

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
  const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
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
async function checkCompanyPolicy(
  _tenantId: string,
  assignment: PersonalAgentAssignment,
  activity: { activityType: string; activityCategory: string; actionPayload: Record<string, unknown> }
): Promise<{
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  ruleApplied?: string;
  compliancePassed: boolean;
  complianceDetails?: Record<string, unknown>;
  enforcementLevel: 'blocking' | 'advisory' | 'informational';
}> {
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
