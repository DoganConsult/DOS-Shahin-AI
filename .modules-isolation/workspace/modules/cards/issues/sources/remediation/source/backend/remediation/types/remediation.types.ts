export interface RemediationTask {
  task_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  source_type: string;
  source_id: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface RemediationTaskCreateInput {
  tenant_id: string;
  title: string;
  description?: string;
  source_type: string;
  source_id: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  created_by: string;
}

export interface RemediationTaskUpdateInput {
  
  title: string;
  description?: string;
  source_type: string;
  source_id: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  updated_by: string;
}

export interface RemediationTaskListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface RemediationTaskListResult {
  rows: RemediationTask[];
  total: number;
}

export type RemediationStatus = 'draft' | 'in_progress' | 'pending_verification' | 'verified' | 'failed' | 'closed' | 'archived';

export const REMEDIATION_STATUSES: readonly RemediationStatus[] = ['draft', 'in_progress', 'pending_verification', 'verified', 'failed', 'closed', 'archived'] as const;



export type RemediationSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const REMEDIATION_SOURCES: readonly RemediationSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type RemediationStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface RemediationEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'remediation';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: RemediationStatus;
  newState?: RemediationStatus;
  data: Record<string, unknown>;
}
