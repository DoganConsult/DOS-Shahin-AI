import type { IssuesStatus, IssuesSeverity, IssuesPriority } from './issues.types';

export interface IssuesCreateDTO {
  title: string;
  description?: string;
  severity?: IssuesSeverity;
  priority?: IssuesPriority;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  source_module?: string;
  source_entity_id?: string;
  issue_type?: 'finding' | 'gap' | 'nonconformity' | 'weakness' | 'observation';
  root_cause?: string;
  impact_description?: string;
  affected_controls?: string[];
  affected_frameworks?: string[];
  resolution_plan?: string;
  resolution_date?: string;
  linked_risk_ids?: string[];
  linked_audit_ids?: string[];
}

export interface IssuesUpdateDTO {
  title?: string;
  description?: string;
  status?: IssuesStatus;
  severity?: IssuesSeverity;
  priority?: IssuesPriority;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  source_module?: string;
  source_entity_id?: string;
  issue_type?: 'finding' | 'gap' | 'nonconformity' | 'weakness' | 'observation';
  root_cause?: string;
  impact_description?: string;
  affected_controls?: string[];
  affected_frameworks?: string[];
  resolution_plan?: string;
  resolution_date?: string;
  verified_by?: string;
  verification_date?: string;
  linked_risk_ids?: string[];
  linked_audit_ids?: string[];
}

export interface IssuesResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: IssuesStatus;
  severity?: IssuesSeverity;
  priority?: IssuesPriority;
  issue_type?: 'finding' | 'gap' | 'nonconformity' | 'weakness' | 'observation';
  source_module?: string;
  source_entity_id?: string;
  root_cause?: string;
  impact_description?: string;
  affected_controls?: string[];
  affected_frameworks?: string[];
  resolution_date?: string;
  verified_by?: string;
  verification_date?: string;
  recurrence_count?: number;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface IssuesListItemDTO {
  id: string;
  title: string;
  status: IssuesStatus;
  severity?: IssuesSeverity;
  priority?: IssuesPriority;
  issue_type?: 'finding' | 'gap' | 'nonconformity' | 'weakness' | 'observation';
  source_module?: string;
  recurrence_count?: number;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface IssuesDetailDTO extends IssuesResponseDTO {
  resolution_plan?: string;
  linked_risk_ids?: string[];
  linked_audit_ids?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface IssuesAdminDTO extends IssuesDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface IssuesImportDTO {
  title: string;
  description?: string;
  status?: string;
  severity?: string;
  issue_type?: string;
  source_module?: string;
  source_entity_id?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface IssuesExportDTO extends IssuesResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface IssuesSearchResultDTO {
  items: IssuesListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface IssuesAuditDTO {
  entity_id: string;
  entity_type: string;
  action: string;
  actor_id: string;
  actor_type: 'user' | 'system' | 'ai_agent';
  timestamp: string;
  previous_state?: string;
  new_state?: string;
  changed_fields?: string[];
  ip_address?: string;
}

export interface IssuesBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
