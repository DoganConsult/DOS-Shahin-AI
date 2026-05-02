export interface Policy {
  policy_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  version: number;
  owner_id: string;
  effective_date?: string;
  review_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface PolicyCreateInput {
  tenant_id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  version: number;
  owner_id: string;
  effective_date?: string;
  review_date?: string;
  created_by: string;
}

export interface PolicyUpdateInput {
  
  title: string;
  description?: string;
  category: string;
  status: string;
  version: number;
  owner_id: string;
  effective_date?: string;
  review_date?: string;
  updated_by: string;
}

export interface PolicyListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface PolicyListResult {
  rows: Policy[];
  total: number;
}

export type PolicyStatus =
  | 'draft' | 'submitted' | 'under_review' | 'revision_requested' | 'resubmitted'
  | 'approved' | 'published' | 'active' | 'review_due' | 'under_revision' | 'retired'
  | 'review' | 'archived' | 'in_review' | 'effective' | 'deprecated';

export const POLICY_STATUSES: readonly PolicyStatus[] = [
  'draft', 'submitted', 'under_review', 'revision_requested', 'resubmitted',
  'approved', 'published', 'active', 'review_due', 'under_revision', 'retired',
  'review', 'archived', 'in_review', 'effective', 'deprecated',
] as const;



export type PolicySource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const POLICY_SOURCES: readonly PolicySource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type PolicyStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface PolicyEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'policy';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: PolicyStatus;
  newState?: PolicyStatus;
  data: Record<string, unknown>;
}
