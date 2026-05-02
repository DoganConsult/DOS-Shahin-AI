export interface BusinessContinuityPlan {
  plan_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  plan_type: string;
  status: string;
  owner_id: string;
  rto_hours?: number;
  rpo_hours?: number;
  last_tested?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface BusinessContinuityPlanCreateInput {
  tenant_id: string;
  title: string;
  description?: string;
  plan_type: string;
  status: string;
  owner_id: string;
  rto_hours?: number;
  rpo_hours?: number;
  last_tested?: string;
  created_by: string;
}

export interface BusinessContinuityPlanUpdateInput {
  
  title: string;
  description?: string;
  plan_type: string;
  status: string;
  owner_id: string;
  rto_hours?: number;
  rpo_hours?: number;
  last_tested?: string;
  updated_by: string;
}

export interface BusinessContinuityPlanListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface BusinessContinuityPlanListResult {
  rows: BusinessContinuityPlan[];
  total: number;
}

export type BcpStatus = 'draft' | 'review' | 'approved' | 'active' | 'exercised' | 'retired' | 'archived';

export const BCP_STATUSES: readonly BcpStatus[] = ['draft', 'review', 'approved', 'active', 'exercised', 'retired', 'archived'] as const;



export type BcpSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const BCP_SOURCES: readonly BcpSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type BcpStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface BcpEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'bcp';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: BcpStatus;
  newState?: BcpStatus;
  data: Record<string, unknown>;
}
