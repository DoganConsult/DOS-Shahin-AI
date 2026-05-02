export interface AiSystem {
  system_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  risk_level: string;
  status: string;
  provider?: string;
  purpose?: string;
  deployment_status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface AiSystemCreateInput {
  tenant_id: string;
  name: string;
  description?: string;
  risk_level: string;
  status: string;
  provider?: string;
  purpose?: string;
  deployment_status?: string;
  created_by: string;
}

export interface AiSystemUpdateInput {
  
  name: string;
  description?: string;
  risk_level: string;
  status: string;
  provider?: string;
  purpose?: string;
  deployment_status?: string;
  updated_by: string;
}

export interface AiSystemListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface AiSystemListResult {
  rows: AiSystem[];
  total: number;
}

export type AiGovernanceStatus = 'draft' | 'under_review' | 'approved' | 'deployed' | 'monitoring' | 'suspended' | 'retired' | 'archived';

export const AI_GOVERNANCE_STATUSES: readonly AiGovernanceStatus[] = ['draft', 'under_review', 'approved', 'deployed', 'monitoring', 'suspended', 'retired', 'archived'] as const;



export type AiGovernanceSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const AI_GOVERNANCE_SOURCES: readonly AiGovernanceSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type AiGovernanceStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface AiGovernanceEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'ai-governance';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: AiGovernanceStatus;
  newState?: AiGovernanceStatus;
  data: Record<string, unknown>;
}
