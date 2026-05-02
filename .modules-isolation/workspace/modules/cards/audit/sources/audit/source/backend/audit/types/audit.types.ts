export interface AuditEngagement {
  audit_id: string;
  tenant_id: string;
  title: string;
  audit_type: string;
  status: string;
  lead_auditor_id?: string;
  scope?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface AuditEngagementCreateInput {
  tenant_id: string;
  title: string;
  audit_type: string;
  status: string;
  lead_auditor_id?: string;
  scope?: string;
  start_date?: string;
  end_date?: string;
  created_by: string;
}

export interface AuditEngagementUpdateInput {
  
  title: string;
  audit_type: string;
  status: string;
  lead_auditor_id?: string;
  scope?: string;
  start_date?: string;
  end_date?: string;
  updated_by: string;
}

export interface AuditEngagementListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface AuditEngagementListResult {
  rows: AuditEngagement[];
  total: number;
}

export type AuditStatus = 'planned' | 'fieldwork' | 'review' | 'draft_report' | 'final_report' | 'closed' | 'archived';

export const AUDIT_STATUSES: readonly AuditStatus[] = ['planned', 'fieldwork', 'review', 'draft_report', 'final_report', 'closed', 'archived'] as const;



export type AuditSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const AUDIT_SOURCES: readonly AuditSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type AuditStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface AuditEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'audit';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: AuditStatus;
  newState?: AuditStatus;
  data: Record<string, unknown>;
}
