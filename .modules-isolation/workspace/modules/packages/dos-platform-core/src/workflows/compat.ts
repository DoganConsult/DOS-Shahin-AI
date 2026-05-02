import { publish } from '../events';

export const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled', 'archived'] as const;
export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];

export type { WorkflowDefinition } from '@dos/types';
export type { ApprovalRecord } from '@dos/types';

export interface WorkflowStep {
  stepId: string;
  code?: string;
  status?: WorkflowStatus | string;
  assigneeId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowExecution {
  executionId: string;
  tenantId: string;
  workflowCode: string;
  status: WorkflowStatus | string;
  steps?: WorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export interface WorkflowExecutionContext {
  tenantId: string;
  userId?: string;
  moduleCode?: string;
  correlationId?: string;
  [k: string]: unknown;
}

export async function emitWorkflowStatusChange(tenantId: string, payload: Record<string, unknown>): Promise<string> {
  return publish('workflow.status_changed', tenantId, payload, { moduleCode: 'workflow', category: 'domain' });
}

export async function emitSlaWarning(tenantId: string, payload: Record<string, unknown>): Promise<string> {
  return publish('workflow.sla_warning', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' as any });
}

export async function emitSlaBreached(tenantId: string, payload: Record<string, unknown>): Promise<string> {
  return publish('workflow.sla_breached', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'error' as any });
}

export async function emitTaskOverdue(tenantId: string, payload: Record<string, unknown>): Promise<string> {
  return publish('workflow.task_overdue', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' as any });
}

export async function emitApprovalEscalated(tenantId: string, payload: Record<string, unknown>): Promise<string> {
  return publish('workflow.approval_escalated', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' as any });
}

export async function primeDescriptorCache(_tenantId: string): Promise<void> {}

export function getFullRegistry(): Record<string, unknown> {
  return {};
}

