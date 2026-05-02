// @ts-nocheck
// ============================================================================
// Personal Agent Approval & Activity Management
//
// Approve, reject, confirm agent activities, plus activity query helpers.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import {
  invalidateAllCaches,
} from './personal-agent-cache.service';
import type { AgentActivity } from './personal-agent.types';
import { getPersonalAgentAssignment } from './personal-agent-assignment.service';
import { executeActivityAction } from './personal-agent-activity.service';

// ============================================================================
// Activity Query
// ============================================================================

/** Get a single agent activity by ID */
export async function getAgentActivity(
  tenantId: string,
  activityId: string
): Promise<AgentActivity | null> {
  const schema = tenantSchema(tenantId);
  throw new Error("Not implemented: Stubbed during microservice extraction");
}

/** Approve a pending agent activity */
export async function approveAgentActivity(
  tenantId: string,
  activityId: string,
  approvedBy: string,
): Promise<AgentActivity> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".agent_activity_log
     SET status = 'approved', approved_by = $1, approved_at = NOW()
     WHERE activity_id = $2`,
    [approvedBy, activityId],
  );
  const activity = await getAgentActivity(tenantId, activityId);
  if (activity) {
    await safeQuery(
      `UPDATE "${schema}".personal_agent_assignments
       SET total_actions_approved = COALESCE(total_actions_approved, 0) + 1, updated_at = NOW()
       WHERE assignment_id = $1`,
      [activity.assignmentId],
    );
    await invalidateAllCaches(tenantId, activity.userId);
  }
  await recordAudit({
    tenantId, userId: approvedBy, module: 'foundation',
    action: 'agent_activity_approved', entityType: 'agent_activity',
    entityId: activityId, afterState: { status: 'approved' },
  });
  return (await getAgentActivity(tenantId, activityId))!;
}

/** Reject a pending agent activity */
export async function rejectAgentActivity(
  tenantId: string,
  activityId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<AgentActivity> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".agent_activity_log
     SET status = 'rejected', rejected_by = $1, rejected_at = NOW(), rejection_reason = $2
     WHERE activity_id = $3`,
    [rejectedBy, rejectionReason, activityId]
  );

  const activity = await getAgentActivity(tenantId, activityId);
  if (activity) {
    await safeQuery(
      `UPDATE "${schema}".personal_agent_assignments
       SET total_actions_rejected = total_actions_rejected + 1,
           updated_at = NOW()
       WHERE assignment_id = $1`,
      [activity.assignmentId]
    );
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

  return (await getAgentActivity(tenantId, activityId))!;
}

// ============================================================================
// Task Confirmation Workflow
// ============================================================================

/**
 * Confirm/Approve an agent activity with detailed confirmation metadata
 */
export async function confirmAgentActivity(
  tenantId: string,
  activityId: string,
  confirmedBy: string,
  confirmation: {
    approved: boolean;
    reason?: string;
    notes?: string;
    riskAssessment?: string;
    complianceNotes?: string;
    overridePolicy?: boolean;
    overrideReason?: string;
  }
): Promise<AgentActivity> {
      throw new Error("Not implemented: Stubbed during microservice extraction");
}

// ============================================================================
// Row Mapper
// ============================================================================

/** Map a database row to an AgentActivity object */
export function mapActivityRow(row: Record<string, unknown>): AgentActivity {
  return {
    activityId: row.activity_id as string,
    tenantId: row.tenant_id as string,
    assignmentId: row.assignment_id as string,
    userId: row.user_id as string,
    agentId: row.agent_id as string,
    activityType: row.activity_type as string,
    activityCategory: row.activity_category as string,
    entityType: row.entity_type as string | undefined,
    entityId: row.entity_id as string | undefined,
    actionTitle: row.action_title as string | undefined,
    actionDescription: row.action_description as string | undefined,
    actionPayload: typeof row.action_payload === 'string' ? JSON.parse(row.action_payload) : row.action_payload as Record<string, unknown>,
    processId: row.process_id as string | undefined,
    processStep: row.process_step as string | undefined,
    governanceRuleApplied: row.governance_rule_applied as string | undefined,
    policyRuleApplied: row.policy_rule_applied as string | undefined,
    slaDeadline: row.sla_deadline as string | undefined,
    slaHoursOverdue: row.sla_hours_overdue as number | undefined,
    triggeredBySla: row.triggered_by_sla as boolean,
    executionMode: row.execution_mode as AgentActivity['executionMode'],
    requiredApproval: row.required_approval as boolean,
    approvedBy: row.approved_by as string | undefined,
    approvedAt: row.approved_at as string | undefined,
    rejectedBy: row.rejected_by as string | undefined,
    rejectedAt: row.rejected_at as string | undefined,
    rejectionReason: row.rejection_reason as string | undefined,
    riskLevel: row.risk_level as string,
    complianceCheckPassed: row.compliance_check_passed as boolean,
    complianceCheckDetails: typeof row.compliance_check_details === 'string' ? JSON.parse(row.compliance_check_details) : row.compliance_check_details as Record<string, unknown> | undefined,
    status: row.status as AgentActivity['status'],
    result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result as Record<string, unknown> | undefined,
    errorMessage: row.error_message as string | undefined,
    executedAt: row.executed_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
    durationMs: row.duration_ms as number | undefined,
    authTokenHash: row.auth_token_hash as string | undefined,
    authMethod: row.auth_method as string | undefined,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    createdAt: row.created_at as string,
  };
}
