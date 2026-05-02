import type { RecordsStatus } from './records.types';

export interface RecordsCreateDTO {
  title: string;
  description?: string;
  record_type: 'document' | 'policy' | 'procedure' | 'form' | 'template' | 'report' | 'certificate';
  record_code?: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retention_period_days?: number;
  retention_policy_id?: string;
  disposal_method?: 'archive' | 'delete' | 'shred' | 'anonymize';
  disposal_date?: string;
  legal_hold?: boolean;
  legal_hold_reason?: string;
  legal_hold_by?: string;
  version_number?: number;
  parent_record_id?: string;
  storage_location?: string;
  file_size_bytes?: number;
  file_type?: string;
  checksum?: string;
  owner_id?: string;
  department_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RecordsUpdateDTO {
  title?: string;
  description?: string;
  status?: RecordsStatus;
  record_type?: 'document' | 'policy' | 'procedure' | 'form' | 'template' | 'report' | 'certificate';
  record_code?: string;
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  retention_period_days?: number;
  retention_policy_id?: string;
  disposal_method?: 'archive' | 'delete' | 'shred' | 'anonymize';
  disposal_date?: string;
  legal_hold?: boolean;
  legal_hold_reason?: string;
  legal_hold_by?: string;
  version_number?: number;
  storage_location?: string;
  owner_id?: string;
  department_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RecordsResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: RecordsStatus;
  record_type?: string;
  record_code?: string;
  classification?: string;
  retention_period_days?: number;
  retention_policy_id?: string;
  disposal_method?: string;
  disposal_date?: string;
  legal_hold?: boolean;
  legal_hold_reason?: string;
  version_number?: number;
  parent_record_id?: string;
  storage_location?: string;
  file_size_bytes?: number;
  file_type?: string;
  checksum?: string;
  owner_id?: string;
  department_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface RecordsListItemDTO {
  id: string;
  title: string;
  status: RecordsStatus;
  record_type?: string;
  record_code?: string;
  classification?: string;
  retention_period_days?: number;
  legal_hold?: boolean;
  disposal_date?: string;
  file_type?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RecordsDetailDTO extends RecordsResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface RecordsAdminDTO extends RecordsDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface RecordsImportDTO {
  title: string;
  description?: string;
  status?: string;
  record_type: string;
  classification: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordsExportDTO extends RecordsResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface RecordsSearchResultDTO {
  items: RecordsListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface RecordsAuditDTO {
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

export interface RecordsBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change' | 'legal_hold' | 'release_hold';
  payload?: Record<string, unknown>;
}
