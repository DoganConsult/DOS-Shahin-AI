export interface ComplianceAssessment {
  assessment_id: string;
  tenant_id: string;
  framework_id: string;
  scope: string;
  status: string;
  score?: number;
  assessor_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface ComplianceAssessmentCreateInput {
  tenant_id: string;
  framework_id: string;
  scope: string;
  status: string;
  score?: number;
  assessor_id?: string;
  created_by: string;
}

export interface ComplianceAssessmentUpdateInput {
  
  framework_id: string;
  scope: string;
  status: string;
  score?: number;
  assessor_id?: string;
  updated_by: string;
}

export interface ComplianceAssessmentListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface ComplianceAssessmentListResult {
  rows: ComplianceAssessment[];
  total: number;
}

export type ComplianceStatus = 'draft' | 'mapped' | 'assessed' | 'compliant' | 'non_compliant' | 'remediation' | 'closed' | 'archived';

export const COMPLIANCE_STATUSES: readonly ComplianceStatus[] = ['draft', 'mapped', 'assessed', 'compliant', 'non_compliant', 'remediation', 'closed', 'archived'] as const;



export type ComplianceSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const COMPLIANCE_SOURCES: readonly ComplianceSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type ComplianceStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface ComplianceEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'compliance';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: ComplianceStatus;
  newState?: ComplianceStatus;
  data: Record<string, unknown>;
}
