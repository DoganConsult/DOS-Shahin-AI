export interface Risk {
  risk_id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score?: number;
  inherent_score?: number;
  residual_score?: number;
  status: string;
  owner: string;
  treatment_plan?: string;
  treatment_status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface RiskCreateInput {
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score?: number;
  inherent_score?: number;
  residual_score?: number;
  status: string;
  owner: string;
  treatment_plan?: string;
  treatment_status?: string;
  created_by: string;
}

export interface RiskUpdateInput {
  
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score?: number;
  inherent_score?: number;
  residual_score?: number;
  status: string;
  owner: string;
  treatment_plan?: string;
  treatment_status?: string;
  updated_by: string;
}

export interface RiskListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface RiskListResult {
  rows: Risk[];
  total: number;
}

export type RiskStatus =
  | 'draft' | 'submitted' | 'under_review' | 'assessed' | 'treatment_planned'
  | 'approved' | 'active' | 'monitoring' | 'closed' | 'retired' | 'returned'
  | 'identified' | 'mitigating' | 'accepted' | 'archived';

export const RISK_STATUSES: readonly RiskStatus[] = [
  'draft', 'submitted', 'under_review', 'assessed', 'treatment_planned',
  'approved', 'active', 'monitoring', 'closed', 'retired', 'returned',
  'identified', 'mitigating', 'accepted', 'archived',
] as const;

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export const RISK_SEVERITIES: readonly RiskSeverity[] = ['critical', 'high', 'medium', 'low', 'info'] as const;

export type RiskPriority = 'critical' | 'high' | 'medium' | 'low';
export const RISK_PRIORITIES: readonly RiskPriority[] = ['critical', 'high', 'medium', 'low'] as const;

export type RiskSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const RISK_SOURCES: readonly RiskSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type RiskStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface RiskEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'risk';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: RiskStatus;
  newState?: RiskStatus;
  data: Record<string, unknown>;
}
