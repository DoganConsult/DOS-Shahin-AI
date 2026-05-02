import type { AuditStatus } from './audit.types';

export interface AuditCreateDTO {
  title: string;
  description?: string;
  audit_type?: 'internal' | 'external' | 'regulatory';
  audit_code?: string;
  scope?: string;
  lead_auditor_id?: string;
  audit_period_start?: string;
  audit_period_end?: string;
  finding_count?: number;
  observation_count?: number;
  opinion?: string;
  report_date?: string;
  framework_id?: string;
  engagement_letter_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuditUpdateDTO {
  title?: string;
  description?: string;
  status?: AuditStatus;
  audit_type?: 'internal' | 'external' | 'regulatory';
  audit_code?: string;
  scope?: string;
  lead_auditor_id?: string;
  audit_period_start?: string;
  audit_period_end?: string;
  finding_count?: number;
  observation_count?: number;
  opinion?: string;
  report_date?: string;
  framework_id?: string;
  engagement_letter_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuditResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: AuditStatus;
  audit_type?: 'internal' | 'external' | 'regulatory';
  audit_code?: string;
  scope?: string;
  lead_auditor_id?: string;
  audit_period_start?: string;
  audit_period_end?: string;
  finding_count?: number;
  observation_count?: number;
  opinion?: string;
  report_date?: string;
  framework_id?: string;
  engagement_letter_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AuditListItemDTO {
  id: string;
  title: string;
  status: AuditStatus;
  audit_type?: 'internal' | 'external' | 'regulatory';
  audit_code?: string;
  lead_auditor_id?: string;
  audit_period_start?: string;
  audit_period_end?: string;
  finding_count?: number;
  opinion?: string;
  report_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditDetailDTO extends AuditResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface AuditAdminDTO extends AuditDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface AuditImportDTO {
  title: string;
  description?: string;
  status?: string;
  audit_type?: string;
  audit_code?: string;
  scope?: string;
  framework_id?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditExportDTO extends AuditResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface AuditSearchResultDTO {
  items: AuditListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface AuditAuditDTO {
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

export interface AuditBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
