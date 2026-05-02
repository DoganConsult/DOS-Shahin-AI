// ============================================================================
// Personal Agent SLA-Based Activation
//
// Detects SLA breaches and triggers agent activities for overdue items.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { AgentActivity } from './personal-agent.types';
import { mapAssignmentRow } from './personal-agent-assignment.service';
import { executeAgentActivity } from './personal-agent-activity.service';

// ============================================================================
// SLA-Based Activation
// ============================================================================

/**
 * Check for SLA breaches and activate agent if threshold passed.
 * Iterates over all SLA-enabled assignments for a user and creates
 * remediation activities for overdue items.
 */
export async function checkSlaAndActivateAgent(
  tenantId: string,
  userId: string
): Promise<AgentActivity[]> {
  const schema = tenantSchema(tenantId);
  const activatedActivities: AgentActivity[] = [];

  // Get user's personal agent assignments with SLA-based activation
  const assignments = await safeQuery(
    `SELECT * FROM "${schema}".personal_agent_assignments
     WHERE tenant_id = $1 AND user_id = $2
       AND is_active = true AND is_enabled = true
       AND sla_based_activation = true`,
    [tenantId, userId]
  );

  for (const assignmentRow of assignments.rows) {
    const assignment = mapAssignmentRow(assignmentRow);

    // Get SLA activation rules for this assignment
    const slaRules = await safeQuery(
      `SELECT * FROM "${schema}".agent_sla_activation_rules
       WHERE tenant_id = $1 AND assignment_id = $2 AND is_active = true`,
      [tenantId, assignment.assignmentId]
    );

    for (const slaRule of slaRules.rows) {
      // Find overdue items
      const overdueItems = await findOverdueItems(
        tenantId,
        slaRule.entity_type,
        slaRule.hours_overdue_threshold,
        slaRule.priority_filter ? JSON.parse(slaRule.priority_filter) : undefined
      );

      for (const item of overdueItems) {
        // Create agent activity for this overdue item
        const activity = await executeAgentActivity(
          tenantId,
          userId,
          assignment.agentId,
          {
            activityType: slaRule.action_type,
            activityCategory: 'sla_remediation',
            entityType: slaRule.entity_type,
            entityId: item.entityId,
            actionTitle: `SLA Breach Remediation: ${item.title}`,
            actionDescription: `Automated action triggered by SLA breach (${item.hoursOverdue} hours overdue)`,
            actionPayload: {
              ...(slaRule.action_template ? JSON.parse(slaRule.action_template) : {}),
              overdueItem: item,
            },
            processId: `sla_remediation_${slaRule.entity_type}`,
            riskLevel: item.priority || 'medium',
            slaDeadline: item.deadline,
          }
        );

        if (activity.canProceed) {
          activatedActivities.push(activity.activity);

          // Update SLA rule trigger count
          await safeQuery(
            `UPDATE "${schema}".agent_sla_activation_rules
             SET last_triggered_at = NOW(), trigger_count = trigger_count + 1
             WHERE rule_id = $1`,
            [slaRule.rule_id]
          );
        }
      }
    }
  }

  return activatedActivities;
}

// ============================================================================
// Overdue Item Detection
// ============================================================================

/** Find overdue items for a given entity type and threshold */
async function findOverdueItems(
  tenantId: string,
  entityType: string,
  hoursThreshold: number,
  priorityFilter?: string[]
): Promise<Array<{ entityId: string; title: string; deadline: string; hoursOverdue: number; priority?: string }>> {
  const schema = tenantSchema(tenantId);
  const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

  // Query overdue workflow instances (tasks / workflow_instance entity types)
  if (entityType === 'task' || entityType === 'workflow_instance') {
    const result = await safeQuery(
      `SELECT workflow_instance_id as entity_id, title, due_date as deadline, priority
       FROM "${schema}".workflow_instances
       WHERE tenant_id = $1
         AND status IN ('Pending', 'InProgress')
         AND due_date < $2
         AND ($3::VARCHAR[] IS NULL OR priority = ANY($3))
       LIMIT 50`,
      [tenantId, thresholdDate.toISOString(), priorityFilter || null]
    );

    return result.rows.map(row => ({
      entityId: row.entity_id,
      title: row.title,
      deadline: row.deadline,
      hoursOverdue: Math.floor((Date.now() - new Date(row.deadline).getTime()) / (1000 * 60 * 60)),
      priority: row.priority,
    }));
  }

  // Add more entity types as needed
  return [];
}
