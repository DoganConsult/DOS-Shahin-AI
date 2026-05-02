export interface ExceptionRequest {
  exception_id: string;
  tenant_id: string;
  control_id: string;
  reason: string;
  status: string;
  requested_by: string;
  approved_by?: string;
  expires_at?: string;
  risk_acceptance?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface ExceptionRequestCreateInput {
  tenant_id: string;
  control_id: string;
  reason: string;
  status: string;
  requested_by: string;
  approved_by?: string;
  expires_at?: string;
  risk_acceptance?: string;
  created_by: string;
}

export interface ExceptionRequestUpdateInput {
  
  control_id: string;
  reason: string;
  status: string;
  requested_by: string;
  approved_by?: string;
  expires_at?: string;
  risk_acceptance?: string;
  updated_by: string;
}

export interface ExceptionRequestListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface ExceptionRequestListResult {
  rows: ExceptionRequest[];
  total: number;
}

export type ExceptionStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'revoked' | 'archived';

export const EXCEPTION_STATUSES: readonly ExceptionStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'revoked', 'archived'] as const;



export type ExceptionSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const EXCEPTION_SOURCES: readonly ExceptionSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type ExceptionStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface ExceptionEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'exception';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: ExceptionStatus;
  newState?: ExceptionStatus;
  data: Record<string, unknown>;
}
