export interface WorkflowInstance {
  instance_id: string;
  tenant_id: string;
  template_code: string;
  module_code: string;
  status: string;
  current_step?: string;
  started_by: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface WorkflowInstanceCreateInput {
  tenant_id: string;
  template_code: string;
  module_code: string;
  status: string;
  current_step?: string;
  started_by: string;
  completed_at?: string;
  created_by: string;
}

export interface WorkflowInstanceUpdateInput {
  
  template_code: string;
  module_code: string;
  status: string;
  current_step?: string;
  started_by: string;
  completed_at?: string;
  updated_by: string;
}

export interface WorkflowInstanceListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface WorkflowInstanceListResult {
  rows: WorkflowInstance[];
  total: number;
}

import type { WorkflowStatus } from '../ports/lifecycle.port';

import { WORKFLOW_STATUSES as _WORKFLOW_STATUSES } from '../ports/lifecycle.port';
export type { WorkflowStatus };
export const WORKFLOW_STATUSES = _WORKFLOW_STATUSES;



export type WorkflowSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const WORKFLOW_SOURCES: readonly WorkflowSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type WorkflowStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface WorkflowEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'workflow';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: WorkflowStatus;
  newState?: WorkflowStatus;
  data: Record<string, unknown>;
}
