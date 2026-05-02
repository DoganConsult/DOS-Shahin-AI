// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
// ============================================
// Cross-Hub: GOVERNANCE WORKFLOW HUB
// Subscribers: governance.board_attention_item, approval.completed, governance.action_overdue
// Purpose: Automatically create process tasks from governance decisions and approvals
// ============================================

import {
  type SubFn,
  createProcessTask,
  type ProcessTaskType,
  safeQuery,
  tenantSchema,
} from './helpers';
import { getFirstRow } from '@dos/db';

export function registerGovernanceHub(sub: SubFn): void {

  // governance.board_attention_item → Process Task: Create action items for board attention
  // When a governance health dimension or vendor risk requires board attention, create a tracked task
  sub('governance.board_attention_item', 'xhub-governance→board-attention', async (e) => {
    const { tenantId, entityId, entityType, payload } = e;

    try {
      // Determine task details from the board attention item
      const schema = tenantSchema(tenantId);
      const itemResult = await safeQuery(
        `SELECT item_id, title, description, severity, dimension_type, due_date
         FROM "${schema}".board_attention_items
         WHERE item_id = $1`,
        [entityId]
      );

      const item = getFirstRow(itemResult);
      if (!item) {
        logger.warn(`[GovernanceHub] Board attention item ${entityId} not found`);
        return;
      }

      // Map severity to priority
      const priorityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
        critical: 'critical',
        high: 'high',
        warning: 'medium',
        info: 'low',
      };
      const priority = priorityMap[item.severity] || 'medium';

      // Determine task type based on dimension type
      let taskType: ProcessTaskType = 'verification';
      if (item.dimension_type?.includes('vendor')) {
        taskType = 'verification';
      } else if (item.dimension_type?.includes('policy') || item.dimension_type?.includes('compliance')) {
        taskType = 'policy_creation';
      } else if (item.dimension_type?.includes('risk')) {
        taskType = 'risk_assessment';
      }

      // Calculate due date (use item due_date or default to 7 days)
      const dueInHours = item.due_date
        ? Math.max(24, Math.round((new Date(item.due_date).getTime() - Date.now()) / 3600000))
        : 168; // 7 days default

      await createProcessTask(tenantId, {
        title: item.title || `Board Attention Required: ${item.dimension_type || 'Governance Issue'}`,
        description: item.description || `Governance board attention item requires action. Dimension: ${item.dimension_type || 'any'}`,
        taskType,
        priority,
        entityType: entityType || 'board_attention_item',
        entityId,
        assigneeRole: 'governance_manager',
        dueInHours,
        triggerSource: 'governance-board-attention',
        triggerData: {
          dimensionType: item.dimension_type,
          severity: item.severity,
          originalEvent: 'governance.board_attention_item',
        },
      });
    } catch (err: unknown) {
      // Non-fatal: task creation is best-effort
      logger.warn(`[GovernanceHub] Failed to create task for board_attention_item: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // approval.completed → Process Task: Create follow-up action items based on approval decision
  // When an approval is completed, create tasks for any required follow-up actions
  sub('approval.completed', 'xhub-governance→approval-completed', async (e) => {
    const { tenantId, entityId, entityType, payload } = e;

    try {
      // Extract approval details from payload
      const approvalId = payload?.approvalId || entityId;
      const decision = payload?.decision || 'approved';
      const executionId = payload?.executionId;

      // Query approval record to get context
      const schema = tenantSchema(tenantId);
      const approvalResult = await safeQuery(
        `SELECT approval_id, entity_type, entity_id, status, decision, conditions, due_date
         FROM "${schema}".approvals
         WHERE approval_id = $1`,
        [approvalId]
      );

      const approval = getFirstRow(approvalResult);
      if (!approval) {
        // Approval might be in workflow_approvals table
        if (executionId) {
          const workflowApprovalResult = await safeQuery(
            `SELECT approval_id, entity_type, entity_id, status, decision
             FROM "${schema}".workflow_approvals
             WHERE approval_id = $1 OR execution_id = $2`,
            [approvalId, executionId]
          );
          const wfApproval = getFirstRow(workflowApprovalResult);
          if (wfApproval) {
            // Use workflow approval data
            // Create task based on workflow approval
            await createProcessTask(tenantId, {
              title: `Follow-up Action: ${wfApproval.entity_type || 'Approved Item'}`,
              description: `Approval completed for ${wfApproval.entity_type || 'item'}. Decision: ${wfApproval.decision || decision}. Review and execute any required follow-up actions.`,
              taskType: 'workflow_task',
              priority: 'medium',
              entityType: wfApproval.entity_type || entityType,
              entityId: wfApproval.entity_id || entityId,
              assigneeRole: 'governance_manager',
              dueInHours: 72, // 3 days default
              triggerSource: 'approval-completed',
              triggerData: {
                approvalId,
                executionId,
                decision: wfApproval.decision || decision,
                originalEvent: 'approval.completed',
              },
            });
          }
        }
        return;
      }

      // Determine task type based on entity type
      const entityTaskTypeMap: Record<string, ProcessTaskType> = {
        policy: 'policy_creation',
        control: 'control_review',
        risk: 'risk_assessment',
        evidence: 'evidence_request',
        audit: 'audit_response',
        incident: 'incident_response',
        vendor: 'verification',
        workflow: 'workflow_task',
      };
      const taskType = entityTaskTypeMap[approval.entity_type] || 'verification';

      // If approval has conditions, create tasks for those
      const conditions = approval.conditions || payload?.conditions;
      if (conditions && typeof conditions === 'object' && conditions.actionItems) {
        // Multiple action items from conditions
        for (const actionItem of conditions.actionItems) {
          await createProcessTask(tenantId, {
            title: actionItem.title || `Action Item: ${approval.entity_type || 'Approved Item'}`,
            description: actionItem.description || `Follow-up action required from approval ${approvalId}`,
            taskType,
            priority: actionItem.priority || 'medium',
            entityType: approval.entity_type || entityType,
            entityId: approval.entity_id || entityId,
            assigneeRole: actionItem.assigneeRole || 'governance_manager',
            dueInHours: actionItem.dueInHours || 72,
            triggerSource: 'approval-completed-conditions',
            triggerData: {
              approvalId,
              decision: approval.decision || decision,
              originalEvent: 'approval.completed',
            },
          });
        }
      } else {
        // Single follow-up task
        const dueInHours = approval.due_date
          ? Math.max(24, Math.round((new Date(approval.due_date).getTime() - Date.now()) / 3600000))
          : 72; // 3 days default

        await createProcessTask(tenantId, {
          title: `Follow-up Action: ${approval.entity_type || 'Approved Item'}`,
          description: `Approval completed for ${approval.entity_type || 'item'}. Decision: ${approval.decision || decision}. Review and execute any required follow-up actions.`,
          taskType,
          priority: 'medium',
          entityType: approval.entity_type || entityType,
          entityId: approval.entity_id || entityId,
          assigneeRole: 'governance_manager',
          dueInHours,
          triggerSource: 'approval-completed',
          triggerData: {
            approvalId,
            decision: approval.decision || decision,
            originalEvent: 'approval.completed',
          },
        });
      }
    } catch (err: unknown) {
      // Non-fatal: task creation is best-effort
      logger.warn(`[GovernanceHub] Failed to create task for approval.completed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // governance.action_overdue → Process Task: Escalate overdue governance actions
  // When a governance action becomes overdue, create an escalation task
  sub('governance.action_overdue', 'xhub-governance→action-overdue', async (e) => {
    const { tenantId, entityId, entityType, payload } = e;

    try {
      // Query the overdue action to get details
      const schema = tenantSchema(tenantId);
      
      // Try multiple possible tables for governance actions
      let actionResult = await safeQuery(
        `SELECT action_id, title, description, due_date, owner_role, entity_type, entity_id, priority
         FROM "${schema}".governance_actions
         WHERE action_id = $1`,
        [entityId]
      );

      if (actionResult.rows.length === 0) {
        // Try committee_actions table
        actionResult = await safeQuery(
          `SELECT action_id, title, description, due_date, assigned_to_role, entity_type, entity_id
           FROM "${schema}".committee_actions
           WHERE action_id = $1`,
          [entityId]
        );
      }

      if (actionResult.rows.length === 0) {
        // Try process_tasks as fallback
        actionResult = await safeQuery(
          `SELECT task_id as action_id, title, description, due_date, assignee_role as owner_role, entity_type, entity_id, priority
           FROM "${schema}".process_tasks
           WHERE task_id = $1 AND status != 'completed'`,
          [entityId]
        );
      }

      const action = getFirstRow(actionResult);
      if (!action) {
        logger.warn(`[GovernanceHub] Overdue action ${entityId} not found`);
        return;
      }

      // Calculate overdue hours
      const dueDate = action.due_date ? new Date(action.due_date) : null;
      const overdueHours = dueDate && dueDate.getTime() < Date.now()
        ? Math.round((Date.now() - dueDate.getTime()) / 3600000)
        : 24; // Default to 24 hours overdue

      // Determine priority based on overdue duration
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (overdueHours > 168) { // > 7 days
        priority = 'critical';
      } else if (overdueHours > 72) { // > 3 days
        priority = 'high';
      }

      // Determine task type based on entity type
      const entityTaskTypeMap: Record<string, ProcessTaskType> = {
        policy: 'policy_creation',
        control: 'control_review',
        risk: 'risk_assessment',
        evidence: 'evidence_request',
        audit: 'audit_response',
        incident: 'incident_response',
        vendor: 'verification',
        committee: 'verification',
        decision: 'verification',
      };
      const taskType = entityTaskTypeMap[action.entity_type] || 'remediation';

      await createProcessTask(tenantId, {
        title: `[OVERDUE] ${action.title || 'Governance Action'}`,
        description: action.description || `Governance action is overdue by ${overdueHours} hours. Immediate attention required.`,
        taskType,
        priority,
        entityType: action.entity_type || entityType,
        entityId: action.entity_id || entityId,
        assigneeRole: action.owner_role || action.assigned_to_role || 'governance_manager',
        dueInHours: 24, // Escalation tasks are urgent
        triggerSource: 'governance-action-overdue',
        triggerData: {
          originalActionId: action.action_id || entityId,
          overdueHours,
          originalDueDate: action.due_date,
          originalEvent: 'governance.action_overdue',
        },
      });
    } catch (err: unknown) {
      // Non-fatal: task creation is best-effort
      logger.warn(`[GovernanceHub] Failed to create escalation task for action_overdue: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
