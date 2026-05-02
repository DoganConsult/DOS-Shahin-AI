export interface MaturityAssessment {
  assessment_id: string;
  tenant_id: string;
  model_code: string;
  scope: string;
  status: string;
  overall_score?: number;
  target_level?: number;
  assessor_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface MaturityAssessmentCreateInput {
  tenant_id: string;
  model_code: string;
  scope: string;
  status: string;
  overall_score?: number;
  target_level?: number;
  assessor_id?: string;
  created_by: string;
}

export interface MaturityAssessmentUpdateInput {
  
  model_code: string;
  scope: string;
  status: string;
  overall_score?: number;
  target_level?: number;
  assessor_id?: string;
  updated_by: string;
}

export interface MaturityAssessmentListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface MaturityAssessmentListResult {
  rows: MaturityAssessment[];
  total: number;
}

export type QiyasStatus = 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'published' | 'archived';

export const QIYAS_STATUSES: readonly QiyasStatus[] = ['draft', 'in_progress', 'completed', 'reviewed', 'published', 'archived'] as const;



export type QiyasSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const QIYAS_SOURCES: readonly QiyasSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type QiyasStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface QiyasEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'qiyas';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: QiyasStatus;
  newState?: QiyasStatus;
  data: Record<string, unknown>;
}
