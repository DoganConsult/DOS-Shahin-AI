export interface Record_ {
  record_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  record_type: string;
  classification: string;
  retention_years: number;
  source_module?: string;
  source_id?: string;
  file_url?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface RecordCreateInput {
  tenant_id: string;
  title: string;
  description?: string;
  record_type: string;
  classification: string;
  retention_years: number;
  source_module?: string;
  source_id?: string;
  file_url?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  created_by: string;
}

export interface RecordUpdateInput {
  title?: string;
  description?: string;
  record_type?: string;
  classification?: string;
  retention_years?: number;
  file_url?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  updated_by: string;
}

export interface RecordListFilter {
  record_type?: string;
  classification?: string;
  source_module?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface RecordListResult {
  rows: Record_[];
  total: number;
}

export type RecordsStatus = 'active' | 'retention' | 'review' | 'hold' | 'disposal_pending' | 'disposed' | 'archived';

export const RECORDS_STATUSES: readonly RecordsStatus[] = ['active', 'retention', 'review', 'hold', 'disposal_pending', 'disposed', 'archived'] as const;



export type RecordsSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const RECORDS_SOURCES: readonly RecordsSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type RecordsStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface RecordsEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'records';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: RecordsStatus;
  newState?: RecordsStatus;
  data: Record<string, unknown>;
}
