import type { PrivacyStatus } from './privacy.types';

export interface PrivacyCreateDTO {
  title: string;
  description?: string;
  request_type: 'access' | 'deletion' | 'rectification' | 'portability' | 'restriction' | 'objection';
  data_subject_id: string;
  data_subject_type?: 'employee' | 'customer' | 'vendor' | 'visitor';
  data_categories?: string[];
  processing_basis?: 'consent' | 'contract' | 'legal_obligation' | 'vital_interest' | 'public_task' | 'legitimate_interest';
  cross_border_transfer?: boolean;
  transfer_destination?: string;
  pia_required?: boolean;
  pia_status?: string;
  consent_id?: string;
  breach_id?: string;
  dpo_review_required?: boolean;
  regulatory_authority?: string;
  response_deadline?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PrivacyUpdateDTO {
  title?: string;
  description?: string;
  status?: PrivacyStatus;
  request_type?: 'access' | 'deletion' | 'rectification' | 'portability' | 'restriction' | 'objection';
  data_subject_type?: 'employee' | 'customer' | 'vendor' | 'visitor';
  data_categories?: string[];
  processing_basis?: string;
  cross_border_transfer?: boolean;
  transfer_destination?: string;
  pia_required?: boolean;
  pia_status?: string;
  consent_id?: string;
  breach_id?: string;
  dpo_review_required?: boolean;
  dpo_reviewed_by?: string;
  regulatory_authority?: string;
  response_deadline?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PrivacyResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: PrivacyStatus;
  request_type?: string;
  data_subject_id?: string;
  data_subject_type?: string;
  data_categories?: string[];
  processing_basis?: string;
  cross_border_transfer?: boolean;
  transfer_destination?: string;
  pia_required?: boolean;
  pia_status?: string;
  consent_id?: string;
  breach_id?: string;
  dpo_review_required?: boolean;
  dpo_reviewed_by?: string;
  regulatory_authority?: string;
  response_deadline?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PrivacyListItemDTO {
  id: string;
  title: string;
  status: PrivacyStatus;
  request_type?: string;
  data_subject_type?: string;
  processing_basis?: string;
  cross_border_transfer?: boolean;
  dpo_review_required?: boolean;
  response_deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface PrivacyDetailDTO extends PrivacyResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface PrivacyAdminDTO extends PrivacyDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface PrivacyImportDTO {
  title: string;
  description?: string;
  status?: string;
  request_type: string;
  data_subject_type?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface PrivacyExportDTO extends PrivacyResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface PrivacySearchResultDTO {
  items: PrivacyListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface PrivacyAuditDTO {
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

export interface PrivacyBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
