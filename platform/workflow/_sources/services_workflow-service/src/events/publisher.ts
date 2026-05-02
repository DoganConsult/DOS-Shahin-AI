import { randomUUID } from 'crypto';
import { publishEvent } from '@dos/module-sdk';
import type { WorkflowInstance } from '../domain/workflow.service';
import type { WorkflowTask } from '../domain/task.service';
import type { ApprovalRequest } from '../domain/approval.service';

export async function publishWorkflowCreated(instance: WorkflowInstance): Promise<void> {
  await publishEvent({
    event_id: randomUUID(),
    event_type: 'workflow.instance_created',
    moduleCode: 'workflow',
    tenantId: instance.tenant_id,
    entityType: 'workflow_instance',
    entityId: instance.instance_id,
    occurredAt: new Date().toISOString(),
    payload: {
      instanceId: instance.instance_id,
      workflowType: instance.workflow_type,
      name: instance.name,
      status: instance.status,
      createdBy: instance.created_by,
    },
  });
}

export async function publishWorkflowCompleted(instance: WorkflowInstance): Promise<void> {
  await publishEvent({
    event_id: randomUUID(),
    event_type: 'workflow.instance_completed',
    moduleCode: 'workflow',
    tenantId: instance.tenant_id,
    entityType: 'workflow_instance',
    entityId: instance.instance_id,
    occurredAt: new Date().toISOString(),
    payload: {
      instanceId: instance.instance_id,
      workflowType: instance.workflow_type,
      name: instance.name,
      completedAt: instance.completed_at,
    },
  });
}

export async function publishTaskAssigned(task: WorkflowTask): Promise<void> {
  await publishEvent({
    event_id: randomUUID(),
    event_type: 'workflow.task_assigned',
    moduleCode: 'workflow',
    tenantId: task.tenant_id,
    entityType: 'workflow_task',
    entityId: task.task_id,
    occurredAt: new Date().toISOString(),
    payload: {
      taskId: task.task_id,
      instanceId: task.instance_id,
      assignedTo: task.assigned_to,
      title: task.title,
    },
  });
}

export async function publishApprovalApproved(approval: ApprovalRequest): Promise<void> {
  await publishEvent({
    event_id: randomUUID(),
    event_type: 'workflow.approval_granted',
    moduleCode: 'workflow',
    tenantId: approval.tenant_id,
    entityType: 'workflow_approval',
    entityId: approval.approval_id,
    occurredAt: new Date().toISOString(),
    payload: {
      approvalId: approval.approval_id,
      workflowInstanceId: approval.workflow_instance_id,
      approvedBy: approval.approved_by,
      subject: approval.subject,
    },
  });
}
